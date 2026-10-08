from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin
from models import Booking, BookingStatus, User
from schemas import BookingResponse, CheckInRequest


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.post(
    "/check-in",
    response_model=BookingResponse
)
def check_in_member(
    data: CheckInRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
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

    booking.checked_in_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(booking)

    return booking