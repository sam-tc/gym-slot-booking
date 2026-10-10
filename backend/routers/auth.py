from fastapi import APIRouter, Depends, HTTPException, status
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from email_service import send_verification_email
from models import User, UserRole

from schemas import (
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResendVerificationRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)

from security import (
    create_access_token,
    decode_email_verification_token,
    hash_password,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    existing_user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An account with this email "
                "already exists"
            )
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.MEMBER,
        email_verified=False,
    )

    db.add(user)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An account with this email "
                "already exists"
            )
        )

    db.refresh(user)

    try:
        send_verification_email(
            user_id=user.id,
            email=user.email,
            name=user.name,
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Account created, but the verification "
                "email could not be sent. "
                "Please request another verification email."
            )
        )

    return user


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if not user or not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Please verify your email "
                "before signing in"
            )
        )

    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post(
    "/verify-email",
    response_model=MessageResponse
)
def verify_email(
    data: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    try:
        user_id = decode_email_verification_token(
            data.token
        )

    except (
        InvalidTokenError,
        ValueError,
        TypeError,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Verification link is invalid "
                "or has expired"
            )
        )

    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.email_verified:
        return {
            "message": "Email is already verified"
        }

    user.email_verified = True
    db.commit()

    return {
        "message": "Email verified successfully"
    }


@router.post(
    "/resend-verification",
    response_model=MessageResponse
)
def resend_verification(
    data: ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    user = db.scalar(
        select(User).where(User.email == data.email)
    )

    generic_message = (
        "If an unverified account exists with "
        "that email, a verification message "
        "has been sent."
    )

    if not user or user.email_verified:
        return {
            "message": generic_message
        }

    try:
        send_verification_email(
            user_id=user.id,
            email=user.email,
            name=user.name,
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Verification email could not "
                "be sent right now"
            )
        )

    return {
        "message": generic_message
    }


@router.get(
    "/me",
    response_model=UserResponse
)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user