from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin
from models import Booking, BookingStatus, GymSession, User
from schemas import AdminBookingResponse, CheckInRequest
from realtime import queue_realtime_update


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.post(
    "/check-in",
    response_model=AdminBookingResponse
)
def check_in_member(
    data: CheckInRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    booking = db.scalar(
        select(Booking)
        .where(
            Booking.check_in_code == data.code
        )
        .with_for_update()
    )

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid check-in code"
        )

    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This booking is not active"
        )

    if booking.checked_in_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This check-in code has already been used"
        )

    gym_session = db.scalar(
        select(GymSession).where(
            GymSession.id == booking.session_id
        )
    )

    if gym_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    now = datetime.now(timezone.utc)

    session_end = gym_session.start_time + timedelta(hours=1)

    if not (
        gym_session.start_time <= now < session_end
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Check-in is only allowed during the session hour"
        )

    booking.checked_in_at = now

    db.commit()
    db.refresh(booking)

    queue_realtime_update(
        background_tasks,
        "session_changed",
        booking.session_id,
    )

    member = db.scalar(
        select(User).where(
            User.id == booking.user_id
        )
    )

    return {
        "id": booking.id,
        "user_id": booking.user_id,
        "member_name": member.name,
        "member_email": member.email,
        "session_id": booking.session_id,
        "session_start_time": gym_session.start_time,
        "status": booking.status.value,
        "check_in_code": booking.check_in_code,
        "checked_in_at": booking.checked_in_at,
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
    }


@router.get(
    "/sessions/{session_id}/bookings",
    response_model=list[AdminBookingResponse]
)
def get_session_bookings(
    session_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    gym_session = db.scalar(
        select(GymSession).where(
            GymSession.id == session_id
        )
    )

    if gym_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    rows = db.execute(
        select(
            Booking,
            User
        )
        .join(
            User,
            User.id == Booking.user_id
        )
        .where(
            Booking.session_id == session_id
        )
        .order_by(
            Booking.created_at
        )
    ).all()

    return [
        {
            "id": booking.id,
            "user_id": user.id,
            "member_name": user.name,
            "member_email": user.email,
            "session_id": booking.session_id,
            "session_start_time": gym_session.start_time,
            "status": booking.status.value,
            "check_in_code": booking.check_in_code,
            "checked_in_at": booking.checked_in_at,
            "created_at": booking.created_at,
            "updated_at": booking.updated_at,
        }
        for booking, user in rows
    ]