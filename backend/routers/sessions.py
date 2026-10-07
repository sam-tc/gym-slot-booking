from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies import (
    get_current_user,
    require_admin,
    require_member,
)
from models import (
    Booking,
    BookingStatus,
    GymSession,
    User,
)
from schemas import (
    BookingResponse,
    SessionCreate,
    SessionListItem,
    SessionResponse,
)
from security import generate_check_in_code

GYM_TIMEZONE = ZoneInfo("Asia/Kolkata")


router = APIRouter(
    prefix="/sessions",
    tags=["Sessions"]
)


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_session(
    data: SessionCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    gym_session = GymSession(
        start_time=data.start_time,
        capacity=20
    )

    db.add(gym_session)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A session with this start time already exists"
        )

    db.refresh(gym_session)

    return gym_session


@router.get(
    "",
    response_model=list[SessionListItem]
)
def list_sessions(
    date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    confirmed_counts = (
        select(
            Booking.session_id,
            func.count(Booking.id).label("confirmed_count")
        )
        .where(
            Booking.status == BookingStatus.CONFIRMED
        )
        .group_by(Booking.session_id)
        .subquery()
    )

    statement = (
        select(
            GymSession,
            func.coalesce(
                confirmed_counts.c.confirmed_count,
                0
            ).label("confirmed_count")
        )
        .outerjoin(
            confirmed_counts,
            confirmed_counts.c.session_id == GymSession.id
        )
        .where(
            GymSession.start_time > datetime.now(timezone.utc)
        )
    )

    if date is not None:
        start_of_day = datetime.combine(
            date,
            time.min,
            tzinfo=GYM_TIMEZONE
        )

        end_of_day = start_of_day + timedelta(days=1)

        statement = statement.where(
            GymSession.start_time >= start_of_day,
            GymSession.start_time < end_of_day
        )

    statement = (
        statement
        .where(
            func.coalesce(
                confirmed_counts.c.confirmed_count,
                0
            ) < GymSession.capacity
        )
        .order_by(GymSession.start_time)
    )

    rows = db.execute(statement).all()

    return [
        {
            "id": gym_session.id,
            "start_time": gym_session.start_time,
            "capacity": gym_session.capacity,
            "seats_remaining":
                gym_session.capacity - confirmed_count
        }
        for gym_session, confirmed_count in rows
    ]


@router.post(
    "/{session_id}/book",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED
)
def book_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_member: User = Depends(require_member)
):
    gym_session = db.scalar(
        select(GymSession)
        .where(GymSession.id == session_id)
        .with_for_update()
    )

    if gym_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    if gym_session.start_time <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This session has already started"
        )

    existing_booking = db.scalar(
        select(Booking).where(
            Booking.user_id == current_member.id,
            Booking.session_id == session_id
        )
    )

    if (
        existing_booking
        and existing_booking.status == BookingStatus.CONFIRMED
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a booking for this session"
        )

    confirmed_count = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.session_id == session_id,
            Booking.status == BookingStatus.CONFIRMED
        )
    )

    if confirmed_count >= gym_session.capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is full"
        )

    check_in_code = generate_check_in_code()

    if existing_booking:
        existing_booking.status = BookingStatus.CONFIRMED
        existing_booking.check_in_code = check_in_code
        existing_booking.checked_in_at = None

        booking = existing_booking

    else:
        booking = Booking(
            user_id=current_member.id,
            session_id=session_id,
            status=BookingStatus.CONFIRMED,
            check_in_code=check_in_code
        )

        db.add(booking)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Booking could not be completed"
        )

    db.refresh(booking)

    return booking