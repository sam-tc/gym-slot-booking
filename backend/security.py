import os

from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash
from jwt import InvalidTokenError

import secrets
import string

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Booking

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(
    os.getenv("JWT_EXPIRE_MINUTES", "60")
)

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set")

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )


def decode_access_token(token: str) -> int:
    payload = jwt.decode(
        token,
        JWT_SECRET,
        algorithms=[JWT_ALGORITHM]
    )

    subject = payload.get("sub")

    if subject is None:
        raise InvalidTokenError("Token has no subject")

    return int(subject)


CHECK_IN_ALPHABET = (
    string.ascii_uppercase
    + string.digits
)


def generate_check_in_code(length: int = 6) -> str:
    return "".join(
        secrets.choice(CHECK_IN_ALPHABET)
        for _ in range(length)
    )


def generate_unique_check_in_code(
    db: Session,
    length: int = 6
) -> str:
    for _ in range(10):
        code = generate_check_in_code(length)

        existing_code = db.scalar(
            select(Booking.id).where(
                Booking.check_in_code == code
            )
        )

        if existing_code is None:
            return code

    raise RuntimeError(
        "Could not generate a unique check-in code"
    )


def create_email_verification_token(
    user_id: int,
    expires_minutes: int = 30,
) -> str:
    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=expires_minutes)
    )

    payload = {
        "sub": str(user_id),
        "purpose": "verify_email",
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def decode_email_verification_token(
    token: str,
) -> int:
    payload = jwt.decode(
        token,
        JWT_SECRET,
        algorithms=[JWT_ALGORITHM],
    )

    if payload.get("purpose") != "verify_email":
        raise InvalidTokenError(
            "Invalid token purpose"
        )

    subject = payload.get("sub")

    if subject is None:
        raise InvalidTokenError(
            "Token has no subject"
        )

    return int(subject)