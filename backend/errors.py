"""Consistent HTTP errors without echoing request bodies or exception text."""

from fastapi import Request
from fastapi.responses import JSONResponse

from .schemas import ErrorDetail, ErrorIssue, ErrorResponse


class ApiError(Exception):
    """An explicitly classified public failure."""

    def __init__(self, status_code: int, code: str, message: str, *, stage: str = "request", issues: list[ErrorIssue] | None = None, context: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.stage = stage
        self.issues = issues or []
        self.context = context or {}


def error_payload(error: ApiError, request_id: str) -> ErrorResponse:
    """Convert a classified error into the documented schema."""
    return ErrorResponse(error=ErrorDetail(code=error.code, message=error.message,
        stage=error.stage, issues=error.issues, context=error.context, request_id=request_id))


async def api_error_handler(request: Request, error: ApiError) -> JSONResponse:
    """Return a stable status/payload; saturation has a retry hint."""
    headers = {"Retry-After": "1"} if error.status_code == 503 else None
    return JSONResponse(error_payload(error, request.state.request_id).model_dump(mode="json"), status_code=error.status_code, headers=headers)
