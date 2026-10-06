import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


logger = logging.getLogger(__name__)


def error_body(
    code: str,
    message: str,
    details=None
):
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details
        }
    }


def register_exception_handlers(app: FastAPI):

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):
        details = []

        for error in exc.errors():
            field_parts = [
                str(part)
                for part in error["loc"]
                if part != "body"
            ]

            details.append({
                "field": ".".join(field_parts),
                "message": error["msg"],
                "type": error["type"]
            })

        return JSONResponse(
            status_code=422,
            content=error_body(
                code="validation_error",
                message="Invalid request data",
                details=details
            )
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc):
        code_map = {
            400: "bad_request",
            401: "unauthorized",
            403: "forbidden",
            404: "not_found",
            409: "conflict",
            422: "validation_error"
        }

        code = code_map.get(
            exc.status_code,
            "http_error"
        )

        message = (
            exc.detail
            if isinstance(exc.detail, str)
            else "Request failed"
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(
                code=code,
                message=message
            )
        )

    @app.exception_handler(Exception)
    async def unexpected_exception_handler(request, exc):
        logger.exception(
            "Unhandled application error",
            exc_info=exc
        )

        return JSONResponse(
            status_code=500,
            content=error_body(
                code="internal_server_error",
                message="An unexpected error occurred"
            )
        )