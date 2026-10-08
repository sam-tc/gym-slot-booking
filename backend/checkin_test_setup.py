from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from database import SessionLocal
from models import Booking, BookingStatus, GymSession, User
from security import generate_unique_check_in_code


GYM_TIMEZONE = ZoneInfo("Asia/Kolkata")

db = SessionLocal()

try:
    # Current gym hour, e.g. 21:00:00
    start_time = datetime.now(GYM_TIMEZONE).replace(
        minute=0,
        second=0,
        microsecond=0
    )

    gym_session = db.scalar(
        select(GymSession).where(
            GymSession.start_time == start_time
        )
    )

    if gym_session is None:
        gym_session = GymSession(
            start_time=start_time,
            capacity=20
        )
        db.add(gym_session)
        db.flush()

    member = db.scalar(
        select(User).where(
            User.email == "user@example.com"
        )
    )

    if member is None:
        raise RuntimeError("user@example.com was not found")

    existing_booking = db.scalar(
        select(Booking).where(
            Booking.user_id == member.id,
            Booking.session_id == gym_session.id
        )
    )

    if existing_booking:
        booking = existing_booking
        booking.status = BookingStatus.CONFIRMED
        booking.checked_in_at = None
        booking.check_in_code = generate_unique_check_in_code(db)

    else:
        confirmed_count = db.scalar(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.session_id == gym_session.id,
                Booking.status == BookingStatus.CONFIRMED
            )
        )

        if confirmed_count >= gym_session.capacity:
            raise RuntimeError("Current-hour session is already full")

        booking = Booking(
            user_id=member.id,
            session_id=gym_session.id,
            status=BookingStatus.CONFIRMED,
            check_in_code=generate_unique_check_in_code(db)
        )

        db.add(booking)

    db.commit()
    db.refresh(booking)
    db.refresh(gym_session)

    print("Check-in test ready.")
    print("Session ID:", gym_session.id)
    print("Session start:", gym_session.start_time)
    print("Booking ID:", booking.id)
    print("Check-in code:", booking.check_in_code)

finally:
    db.close()