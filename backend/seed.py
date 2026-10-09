from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete

from database import SessionLocal
from models import (
    Booking,
    BookingStatus,
    GymSession,
    User,
    UserRole,
    WaitlistEntry,
)
from security import (
    generate_unique_check_in_code,
    hash_password,
)


GYM_TIMEZONE = ZoneInfo("Asia/Kolkata")


ADMIN_EMAIL = "riya.admin@example.com"
ADMIN_PASSWORD = "RiyaAdmin#27"

AARAV_EMAIL = "aarav.mehta@example.com"
AARAV_PASSWORD = "AaravGym#41"

NAINA_EMAIL = "naina.kapoor@example.com"
NAINA_PASSWORD = "NainaFit#52"

ISHITA_EMAIL = "ishita.verma@example.com"
ISHITA_PASSWORD = "IshitaGym#63"


def future_session_time(
    days_from_today: int,
    hour: int,
) -> datetime:
    target_date = (
        datetime.now(GYM_TIMEZONE).date()
        + timedelta(days=days_from_today)
    )

    return datetime(
        target_date.year,
        target_date.month,
        target_date.day,
        hour,
        0,
        0,
        tzinfo=GYM_TIMEZONE,
    )


def create_confirmed_booking(
    db,
    user,
    gym_session,
):
    booking = Booking(
        user_id=user.id,
        session_id=gym_session.id,
        status=BookingStatus.CONFIRMED,
        check_in_code=
            generate_unique_check_in_code(db),
    )

    db.add(booking)
    db.flush()

    return booking


def seed_database():
    db = SessionLocal()

    try:
        print("Cleaning old development data...")

        db.execute(delete(WaitlistEntry))
        db.execute(delete(Booking))
        db.execute(delete(GymSession))
        db.execute(delete(User))

        db.flush()


        print("Creating demo users...")


        admin = User(
            name="Riya Malhotra",
            email=ADMIN_EMAIL,
            password_hash=
                hash_password(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
        )


        aarav = User(
            name="Aarav Mehta",
            email=AARAV_EMAIL,
            password_hash=
                hash_password(AARAV_PASSWORD),
            role=UserRole.MEMBER,
        )


        naina = User(
            name="Naina Kapoor",
            email=NAINA_EMAIL,
            password_hash=
                hash_password(NAINA_PASSWORD),
            role=UserRole.MEMBER,
        )


        ishita = User(
            name="Ishita Verma",
            email=ISHITA_EMAIL,
            password_hash=
                hash_password(ISHITA_PASSWORD),
            role=UserRole.MEMBER,
        )


        demo_members = [
            aarav,
            naina,
            ishita,
        ]


        filler_names = [
            "Kabir Sharma",
            "Ananya Rao",
            "Vihaan Malhotra",
            "Meera Iyer",
            "Arjun Khanna",
            "Sara Jain",
            "Rohan Gupta",
            "Kiara Bansal",
            "Dev Arora",
            "Aisha Sethi",
            "Aditya Nair",
            "Tara Singhania",
            "Reyansh Bose",
            "Myra Chawla",
            "Kunal Joshi",
            "Avni Desai",
            "Dhruv Menon",
            "Siya Oberoi",
            "Yash Mehta",
            "Priya Kapoor",
        ]


        filler_members = []

        for index, name in enumerate(
            filler_names,
            start=1,
        ):
            email_name = (
                name.lower()
                .replace(" ", ".")
            )

            filler = User(
                name=name,
                email=(
                    f"{email_name}@example.com"
                ),
                password_hash=hash_password(
                    f"DemoGym{index:02d}!"
                ),
                role=UserRole.MEMBER,
            )

            filler_members.append(filler)


        db.add_all(
            [
                admin,
                *demo_members,
                *filler_members,
            ]
        )

        db.flush()


        print("Creating sessions...")


        booked_session = GymSession(
            start_time=
                future_session_time(1, 7),
            capacity=20,
        )


        cancelled_session = GymSession(
            start_time=
                future_session_time(1, 18),
            capacity=20,
        )


        open_session = GymSession(
            start_time=
                future_session_time(2, 7),
            capacity=20,
        )


        waitlisted_full_session = GymSession(
            start_time=
                future_session_time(3, 18),
            capacity=20,
        )


        joinable_full_session = GymSession(
            start_time=
                future_session_time(4, 18),
            capacity=20,
        )


        db.add_all(
            [
                booked_session,
                cancelled_session,
                open_session,
                waitlisted_full_session,
                joinable_full_session,
            ]
        )

        db.flush()


        print("Creating member demo states...")


        # Every demo member has a confirmed booking.
        for member in demo_members:
            create_confirmed_booking(
                db,
                member,
                booked_session,
            )


        # Every demo member also has a cancelled
        # booking in another session.
        for member in demo_members:
            db.add(
                Booking(
                    user_id=member.id,
                    session_id=
                        cancelled_session.id,
                    status=
                        BookingStatus.CANCELLED,
                    check_in_code=None,
                    checked_in_at=None,
                )
            )

        db.flush()


        print("Creating full sessions...")


        # Both full sessions contain exactly
        # 20 confirmed bookings.
        for member in filler_members:
            create_confirmed_booking(
                db,
                member,
                waitlisted_full_session,
            )

            create_confirmed_booking(
                db,
                member,
                joinable_full_session,
            )


        print("Creating waitlist states...")


        # Every demo member is already waiting
        # for this full session.
        for member in demo_members:
            db.add(
                WaitlistEntry(
                    user_id=member.id,
                    session_id=
                        waitlisted_full_session.id,
                )
            )


        # Nobody is waitlisted on
        # joinable_full_session.
        #
        # Therefore demo members will see
        # "Join waitlist" there.


        db.commit()


        print()
        print("Database seeded successfully.")

        print()
        print("ADMIN")
        print("Riya Malhotra")
        print(ADMIN_EMAIL)
        print(ADMIN_PASSWORD)

        print()
        print("MEMBER")
        print("Aarav Mehta")
        print(AARAV_EMAIL)
        print(AARAV_PASSWORD)

        print()
        print("MEMBER")
        print("Naina Kapoor")
        print(NAINA_EMAIL)
        print(NAINA_PASSWORD)

        print()
        print("MEMBER")
        print("Ishita Verma")
        print(ISHITA_EMAIL)
        print(ISHITA_PASSWORD)

        print()
        print("DEMO MEMBER STATES")
        print(
            booked_session.start_time,
            "- Booked",
        )
        print(
            cancelled_session.start_time,
            "- Cancelled / can rebook",
        )
        print(
            open_session.start_time,
            "- Available to book",
        )
        print(
            waitlisted_full_session.start_time,
            "- Waitlisted",
        )
        print(
            joinable_full_session.start_time,
            "- Full / can join waitlist",
        )


    except Exception:
        db.rollback()

        print(
            "Seed failed. Changes rolled back."
        )

        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()