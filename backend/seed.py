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

ADMIN_PASSWORD = "AdminTest123!"
MEMBER_PASSWORD = "MemberTest123!"
WAITLIST_PASSWORD = "Waitlist123!"
FILLER_PASSWORD = "DemoMember123!"


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


        print("Creating users...")

        admin = User(
            name="Riya Malhotra",
            email="riya.admin@example.com",
            password_hash=hash_password(
                ADMIN_PASSWORD
            ),
            role=UserRole.ADMIN,
        )

        member_one = User(
            name="Aarav Mehta",
            email="aarav.mehta@example.com",
            password_hash=hash_password(
                MEMBER_PASSWORD
            ),
            role=UserRole.MEMBER,
        )

        member_two = User(
            name="Naina Kapoor",
            email="naina.kapoor@example.com",
            password_hash=hash_password(
                MEMBER_PASSWORD
            ),
            role=UserRole.MEMBER,
        )

        waitlist_member = User(
            name="Ishita Verma",
            email="ishita.verma@example.com",
            password_hash=hash_password(
                WAITLIST_PASSWORD
            ),
            role=UserRole.MEMBER,
        )


        filler_data = [
            ("Kabir Sharma", "kabir.sharma"),
            ("Ananya Rao", "ananya.rao"),
            ("Vihaan Malhotra", "vihaan.malhotra"),
            ("Meera Iyer", "meera.iyer"),
            ("Arjun Khanna", "arjun.khanna"),
            ("Sara Jain", "sara.jain"),
            ("Rohan Gupta", "rohan.gupta"),
            ("Kiara Bansal", "kiara.bansal"),
            ("Dev Arora", "dev.arora"),
            ("Aisha Sethi", "aisha.sethi"),
            ("Aditya Nair", "aditya.nair"),
            ("Tara Singhania", "tara.singhania"),
            ("Reyansh Bose", "reyansh.bose"),
            ("Myra Chawla", "myra.chawla"),
            ("Kunal Joshi", "kunal.joshi"),
            ("Avni Desai", "avni.desai"),
            ("Dhruv Menon", "dhruv.menon"),
            ("Siya Oberoi", "siya.oberoi"),
        ]


        filler_members = [
            User(
                name=name,
                email=f"{email}@example.com",
                password_hash=hash_password(
                    FILLER_PASSWORD
                ),
                role=UserRole.MEMBER,
            )
            for name, email in filler_data
        ]


        db.add_all(
            [
                admin,
                member_one,
                member_two,
                waitlist_member,
                *filler_members,
            ]
        )

        db.flush()


        print("Creating sessions...")

        morning_session = GymSession(
            start_time=
                future_session_time(1, 7),
            capacity=20,
        )

        evening_session = GymSession(
            start_time=
                future_session_time(1, 18),
            capacity=20,
        )

        second_day_session = GymSession(
            start_time=
                future_session_time(2, 7),
            capacity=20,
        )

        full_session = GymSession(
            start_time=
                future_session_time(3, 18),
            capacity=20,
        )

        empty_session = GymSession(
            start_time=
                future_session_time(4, 19),
            capacity=20,
        )


        db.add_all(
            [
                morning_session,
                evening_session,
                second_day_session,
                full_session,
                empty_session,
            ]
        )

        db.flush()


        print("Creating bookings...")

        create_confirmed_booking(
            db,
            member_one,
            morning_session,
        )

        create_confirmed_booking(
            db,
            member_two,
            evening_session,
        )

        create_confirmed_booking(
            db,
            member_one,
            second_day_session,
        )


        cancelled_booking = Booking(
            user_id=member_two.id,
            session_id=second_day_session.id,
            status=BookingStatus.CANCELLED,
            check_in_code=None,
            checked_in_at=None,
        )

        db.add(cancelled_booking)
        db.flush()


        print("Creating full session...")

        full_session_members = [
            member_one,
            member_two,
            *filler_members,
        ]

        assert len(full_session_members) == 20

        for member in full_session_members:
            create_confirmed_booking(
                db,
                member,
                full_session,
            )


        db.add(
            WaitlistEntry(
                user_id=waitlist_member.id,
                session_id=full_session.id,
            )
        )


        db.commit()


        print()
        print("Database seeded successfully.")

        print()
        print("ADMIN")
        print("Riya Malhotra")
        print("riya.admin@example.com")
        print(ADMIN_PASSWORD)

        print()
        print("MEMBER")
        print("Aarav Mehta")
        print("aarav.mehta@example.com")
        print(MEMBER_PASSWORD)

        print()
        print("MEMBER")
        print("Naina Kapoor")
        print("naina.kapoor@example.com")
        print(MEMBER_PASSWORD)

        print()
        print("WAITLIST MEMBER")
        print("Ishita Verma")
        print("ishita.verma@example.com")
        print(WAITLIST_PASSWORD)

        print()
        print("FULL SESSION")
        print(full_session.start_time)
        print("20/20 booked")


    except Exception:
        db.rollback()
        print("Seed failed. Changes rolled back.")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()