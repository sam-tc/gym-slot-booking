from fastapi import FastAPI

from routers.auth import router as auth_router
from errors import register_exception_handlers


app = FastAPI()

register_exception_handlers(app)

app.include_router(auth_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}