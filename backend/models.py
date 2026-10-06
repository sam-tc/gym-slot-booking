from datetime import datetime
from enum import Enum

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SQLEnum,
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