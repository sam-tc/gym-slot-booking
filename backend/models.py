from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class UserRole(str, Enum):
    MEMBER = "member"
    ADMIN = "admin"

class BookingStatus(str, Enum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    role: Mapped[UserRole] = mapped_column(
        SQLEnum(
            UserRole,
            name="user_role",
            values_callable=lambda enum_class: [
                member.value for member in enum_class
            ]
        ),
        nullable=False,
        default=UserRole.MEMBER
    )

    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )


class GymSession(Base):
    __tablename__ = "sessions"

    __table_args__ = (
        UniqueConstraint(
            "start_time",
            name="uq_sessions_start_time"
        ),
        CheckConstraint(
            "capacity = 20",
            name="ck_sessions_capacity_20"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=20,
        server_default="20"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )


class Booking(Base):
    __tablename__ = "bookings"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "session_id",
            name="uq_booking_user_session"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    session_id: Mapped[int] = mapped_column(
        ForeignKey("sessions.id"),
        nullable=False,
        index=True
    )

    status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(
            BookingStatus,
            name="booking_status",
            values_callable=lambda enum_class: [
                member.value for member in enum_class
            ]
        ),
        nullable=False
    )

    check_in_code: Mapped[str | None] = mapped_column(
        String(20),
        unique=True,
        nullable=True
    )

    checked_in_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )


class WaitlistEntry(Base):
    __tablename__ = "waitlist"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "session_id",
            name="uq_waitlist_user_session"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    session_id: Mapped[int] = mapped_column(
        ForeignKey("sessions.id"),
        nullable=False,
        index=True
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )