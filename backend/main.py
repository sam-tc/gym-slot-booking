import os

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import (
    CORSMiddleware,
)
from jwt import InvalidTokenError

from database import SessionLocal
from errors import register_exception_handlers
from models import User
from realtime import manager
from security import decode_access_token

from routers.admin import (
    router as admin_router,
)
from routers.auth import (
    router as auth_router,
)
from routers.bookings import (
    router as bookings_router,
)
from routers.sessions import (
    router as sessions_router,
)
from routers.waitlist import (
    member_waitlist_router,
    router as waitlist_router,
)


app = FastAPI()


DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


configured_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "",
)


production_origins = [
    origin.strip().rstrip("/")
    for origin in configured_origins.split(",")
    if origin.strip()
]


allowed_origins = list(
    dict.fromkeys(
        DEFAULT_ORIGINS
        + production_origins
    )
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


register_exception_handlers(app)


app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(bookings_router)
app.include_router(waitlist_router)
app.include_router(
    member_waitlist_router
)
app.include_router(admin_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


@app.get("/time")
def get_server_time():
    now = datetime.now(
        ZoneInfo("Asia/Kolkata")
    )

    return {
        "current_time":
            now.isoformat(),
        "timezone":
            "Asia/Kolkata",
    }


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
):
    try:
        user_id = decode_access_token(
            token
        )

    except (
        InvalidTokenError,
        ValueError,
        TypeError,
    ):
        await websocket.close(
            code=1008
        )
        return


    db = SessionLocal()

    try:
        user = db.get(
            User,
            user_id,
        )
    finally:
        db.close()


    if user is None:
        await websocket.close(
            code=1008
        )
        return


    await manager.connect(
        websocket
    )

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(
            websocket
        )