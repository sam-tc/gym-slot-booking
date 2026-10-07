from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_member
from models import (
    Booking,
    BookingStatus,
    GymSession,
    User,
    WaitlistEntry,
)
from schemas import WaitlistResponse


router = APIRouter(
    prefix="/sessions",
    tags=["Waitlist"]
)


@router.post(
    "/{session_id}/waitlist",
    response_model=WaitlistResponse,
    status_code=status.HTTP_201_CREATED
)
def join_waitlist(
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

    booking = db.scalar(
        select(Booking).where(
            Booking.user_id == current_member.id,
            Booking.session_id == session_id,
            Booking.status == BookingStatus.CONFIRMED
        )
    )

    if booking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a confirmed booking for this session"
        )

    existing_waitlist_entry = db.scalar(
        select(WaitlistEntry).where(
            WaitlistEntry.user_id == current_member.id,
            WaitlistEntry.session_id == session_id
        )
    )

    if existing_waitlist_entry:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already on the waitlist for this session"
        )

    confirmed_count = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.session_id == session_id,
            Booking.status == BookingStatus.CONFIRMED
        )
    )

    if confirmed_count < gym_session.capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session still has seats available"
        )

    waitlist_entry = WaitlistEntry(
        user_id=current_member.id,
        session_id=session_id
    )

    db.add(waitlist_entry)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already on the waitlist for this session"
        )

    db.refresh(waitlist_entry)

    return waitlist_entry


@router.delete(
    "/{session_id}/waitlist",
    status_code=status.HTTP_204_NO_CONTENT
)
def leave_waitlist(
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

    waitlist_entry = db.scalar(
        select(WaitlistEntry).where(
            WaitlistEntry.user_id == current_member.id,
            WaitlistEntry.session_id == session_id
        )
    )

    if waitlist_entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Waitlist entry not found"
        )

    db.delete(waitlist_entry)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)