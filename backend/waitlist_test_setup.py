import uuid

from datetime import datetime, timedelta, timezone
from sqlalchemy import select

from database import SessionLocal
from models import (
    Booking,
    BookingStatus,
    GymSession,
    User,
    UserRole,
)
from security import hash_password


db = SessionLocal()

try:
    suffix = uuid.uuid4().hex[:8]

    # Pick a future session, exactly on the hour.
    start_time = (
        datetime.now(timezone.utc) + timedelta(days=40)
    ).replace(
        minute=0,
        second=0,
        microsecond=0
    )

    # Avoid accidentally using an existing start time.
    while db.scalar(
        select(GymSession).where(
            GymSession.start_time == start_time
        )
    ):
        start_time += timedelta(hours=1)

    gym_session = GymSession(
        start_time=start_time,
        capacity=20
    )

    db.add(gym_session)
    db.flush()

    password_hash = hash_password("WaitlistTest123!")

    for i in range(20):
        user = User(
            name=f"Waitlist Test User {i + 1}",
            email=f"waitlist_{suffix}_{i + 1}@example.com",
            password_hash=password_hash,
            role=UserRole.MEMBER
        )

        db.add(user)
        db.flush()

        booking = Booking(
            user_id=user.id,
            session_id=gym_session.id,
            status=BookingStatus.CONFIRMED,
            check_in_code=f"W{suffix[:3].upper()}{i:02d}"
        )

        db.add(booking)

    db.commit()

    print("Full test session created.")
    print("Session ID:", gym_session.id)
    print("Start time:", gym_session.start_time)
    print("Confirmed bookings: 20")

finally:
    db.close()