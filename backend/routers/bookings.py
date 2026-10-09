from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
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
from schemas import BookingResponse, MyBookingResponse

from security import generate_unique_check_in_code

from realtime import queue_realtime_update


router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)


@router.get(
    "/me",
    response_model=list[MyBookingResponse]
)
def get_my_bookings(
    db: Session = Depends(get_db),
    current_member: User = Depends(require_member)
):
    rows = db.execute(
        select(
            Booking,
            GymSession.start_time
        )
        .join(
            GymSession,
            GymSession.id == Booking.session_id
        )
        .where(
            Booking.user_id == current_member.id
        )
        .order_by(
            GymSession.start_time
        )
    ).all()

    return [
        {
            "id": booking.id,
            "session_id": booking.session_id,
            "session_start_time": session_start_time,
            "status": booking.status.value,
            "check_in_code": booking.check_in_code,
            "checked_in_at": booking.checked_in_at,
            "created_at": booking.created_at,
            "updated_at": booking.updated_at,
        }
        for booking, session_start_time in rows
    ]


@router.post(
    "/{booking_id}/cancel",
    response_model=BookingResponse
)
def cancel_booking(
    booking_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_member: User = Depends(require_member)
):
    # First find the member's booking so we know which session to lock.
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

    session_id = booking.session_id

    # All booking/waitlist changes for a session coordinate
    # through this session-row lock.
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

    # Re-read after acquiring the session lock so we work
    # with the latest booking state.
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

    if gym_session.start_time <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Booking cannot be cancelled after the session has started"
        )

    # Cancel the current member's booking.
    booking.status = BookingStatus.CANCELLED
    booking.check_in_code = None
    booking.checked_in_at = None

    # Promote the first valid person on the waitlist.
    while True:
        first_waiting = db.scalar(
            select(WaitlistEntry)
            .where(
                WaitlistEntry.session_id == session_id
            )
            .order_by(
                WaitlistEntry.joined_at,
                WaitlistEntry.id
            )
            .limit(1)
        )

        if first_waiting is None:
            break

        promoted_booking = db.scalar(
            select(Booking).where(
                Booking.user_id == first_waiting.user_id,
                Booking.session_id == session_id
            )
        )

        # Defensive cleanup:
        # if a stale waitlist entry belongs to somebody
        # who is already confirmed, remove it and try
        # the next person.
        if (
            promoted_booking is not None
            and promoted_booking.status == BookingStatus.CONFIRMED
        ):
            db.delete(first_waiting)
            db.flush()
            continue

        new_code = generate_unique_check_in_code(db)

        if promoted_booking is not None:
            # The member may have an old CANCELLED booking row.
            promoted_booking.status = BookingStatus.CONFIRMED
            promoted_booking.check_in_code = new_code
            promoted_booking.checked_in_at = None
        else:
            promoted_booking = Booking(
                user_id=first_waiting.user_id,
                session_id=session_id,
                status=BookingStatus.CONFIRMED,
                check_in_code=new_code
            )

            db.add(promoted_booking)

        # They are no longer waiting because they now have the seat.
        db.delete(first_waiting)

        break

    # Cancellation + promotion happen together.
    db.commit()
    db.refresh(booking)

    queue_realtime_update(
        background_tasks,
        "session_changed",
        session_id,
    )

    return booking