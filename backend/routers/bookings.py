from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_member
from models import Booking, BookingStatus, GymSession, User
from schemas import BookingResponse


router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)


@router.post(
    "/{booking_id}/cancel",
    response_model=BookingResponse
)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_member: User = Depends(require_member)
):
    booking = db.scalar(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.user_id == current_member.id
        )
    )

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Booking is already cancelled"
        )

    gym_session = db.scalar(
        select(GymSession)
        .where(GymSession.id == booking.session_id)
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
            detail="Booking cannot be cancelled after the session has started"
        )

    booking.status = BookingStatus.CANCELLED
    booking.check_in_code = None
    booking.checked_in_at = None

    db.commit()
    db.refresh(booking)

    return booking