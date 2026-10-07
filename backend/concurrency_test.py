import json
import threading
import urllib.error
import urllib.request
import uuid

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select

from database import SessionLocal
from models import (
    Booking,
    BookingStatus,
    GymSession,
    User,
    UserRole,
)
from security import create_access_token, hash_password


BASE_URL = "http://127.0.0.1:8000"


def send_booking_request(
    session_id: int,
    token: str,
    barrier: threading.Barrier
):
    barrier.wait()

    request = urllib.request.Request(
        f"{BASE_URL}/sessions/{session_id}/book",
        method="POST",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    try:
        with urllib.request.urlopen(request) as response:
            body = json.loads(response.read().decode())

            return response.status, body

    except urllib.error.HTTPError as error:
        body = json.loads(error.read().decode())

        return error.code, body


def main():
    suffix = uuid.uuid4().hex[:8]
    password_hash = hash_password("LoadTest123!")

    db = SessionLocal()

    test_session_id = None
    test_user_ids = []

    try:
        # Create a future session exactly on the hour.
        start_time = (
            datetime.now(timezone.utc)
            + timedelta(days=30)
        ).replace(
            minute=0,
            second=0,
            microsecond=0
        )

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

        test_session_id = gym_session.id

        # Create 21 temporary members.
        users = []

        for i in range(21):
            user = User(
                name=f"Load Test User {i + 1}",
                email=f"loadtest_{suffix}_{i + 1}@example.com",
                password_hash=password_hash,
                role=UserRole.MEMBER
            )

            db.add(user)
            users.append(user)

        db.flush()

        test_user_ids = [user.id for user in users]

        # Fill 19 of the 20 seats.
        for i in range(19):
            booking = Booking(
                user_id=users[i].id,
                session_id=test_session_id,
                status=BookingStatus.CONFIRMED,
                check_in_code=f"T{suffix[:4]}{i:02d}"
            )

            db.add(booking)

        db.commit()

        print(
            f"Created test session {test_session_id} "
            "with 19 confirmed bookings."
        )

        # Users 20 and 21 compete for the final seat.
        token_a = create_access_token(users[19].id)
        token_b = create_access_token(users[20].id)

        barrier = threading.Barrier(2)

        with ThreadPoolExecutor(max_workers=2) as executor:
            future_a = executor.submit(
                send_booking_request,
                test_session_id,
                token_a,
                barrier
            )

            future_b = executor.submit(
                send_booking_request,
                test_session_id,
                token_b,
                barrier
            )

            result_a = future_a.result()
            result_b = future_b.result()

        print("Request A:", result_a)
        print("Request B:", result_b)

        verify_db = SessionLocal()

        try:
            confirmed_count = verify_db.scalar(
                select(func.count())
                .select_from(Booking)
                .where(
                    Booking.session_id == test_session_id,
                    Booking.status == BookingStatus.CONFIRMED
                )
            )

            print(
                "Final confirmed booking count:",
                confirmed_count
            )

        finally:
            verify_db.close()

        statuses = sorted([
            result_a[0],
            result_b[0]
        ])

        if statuses == [201, 409] and confirmed_count == 20:
            print(
                "\nPASS: concurrency protection works. "
                "The session never exceeded 20 bookings."
            )
        else:
            print(
                "\nFAIL: unexpected concurrency result."
            )

    finally:
        cleanup_db = SessionLocal()

        try:
            if test_session_id is not None:
                cleanup_db.execute(
                    delete(Booking).where(
                        Booking.session_id == test_session_id
                    )
                )

            if test_user_ids:
                cleanup_db.execute(
                    delete(User).where(
                        User.id.in_(test_user_ids)
                    )
                )

            if test_session_id is not None:
                cleanup_db.execute(
                    delete(GymSession).where(
                        GymSession.id == test_session_id
                    )
                )

            cleanup_db.commit()

        finally:
            cleanup_db.close()

        db.close()


if __name__ == "__main__":
    main()