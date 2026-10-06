from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin
from models import GymSession, User
from schemas import SessionCreate, SessionResponse


router = APIRouter(
    prefix="/sessions",
    tags=["Sessions"]
)


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_session(
    data: SessionCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    gym_session = GymSession(
        start_time=data.start_time,
        capacity=20
    )

    db.add(gym_session)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A session with this start time already exists"
        )

    db.refresh(gym_session)

    return gym_session