from fastapi import FastAPI

from errors import register_exception_handlers
from routers.auth import router as auth_router
from routers.sessions import router as sessions_router
from routers.bookings import router as bookings_router


app = FastAPI()

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(bookings_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}