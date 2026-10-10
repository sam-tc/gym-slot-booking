from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Name cannot be empty")

        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    email_verified: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_login_email(cls, value: EmailStr) -> str:
        return str(value).lower()

class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class VerifyEmailRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=1)


class ResendVerificationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()


class MessageResponse(BaseModel):
    message: str


class SessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start_time: datetime

    @field_validator("start_time")
    @classmethod
    def validate_start_time(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError(
                "Start time must include a timezone"
            )

        if (
            value.minute != 0
            or value.second != 0
            or value.microsecond != 0
        ):
            raise ValueError(
                "Session must start exactly on the hour"
            )

        return value


class SessionResponse(BaseModel):
    id: int
    start_time: datetime
    capacity: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookingResponse(BaseModel):
    id: int
    session_id: int
    status: str
    check_in_code: str | None
    checked_in_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionListItem(BaseModel):
    id: int
    start_time: datetime
    capacity: int
    seats_remaining: int


class MyBookingResponse(BaseModel):
    id: int
    session_id: int
    session_start_time: datetime
    status: str
    check_in_code: str | None
    checked_in_at: datetime | None
    created_at: datetime
    updated_at: datetime


class WaitlistResponse(BaseModel):
    id: int
    session_id: int
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CheckInRequest(BaseModel):
    code: str


class AdminBookingResponse(BaseModel):
    id: int
    user_id: int
    member_name: str
    member_email: str
    session_id: int
    session_start_time: datetime
    status: str
    check_in_code: str | None
    checked_in_at: datetime | None
    created_at: datetime
    updated_at: datetime


class MyWaitlistResponse(BaseModel):
    id: int
    session_id: int
    session_start_time: datetime
    joined_at: datetime