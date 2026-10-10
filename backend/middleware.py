"""Streaming multipart budget enforcement without whole-body buffering."""

from uuid import uuid4

from starlette.formparsers import MultiPartException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .errors import ApiError, error_payload

BODY_LIMIT_DETAIL = "SEGMENTIQ_REQUEST_BODY_LIMIT_EXCEEDED"


class RequestBudgetMiddleware:
    """Check declared and actual size; partial parser files close on overflow.

    MultiPartException is intentional: Starlette closes any partially created
    multipart files before converting it to an HTTP error. The global handler
    translates this marker into the same 413 schema as an early rejection.
    """

    def __init__(self, app: ASGIApp, *, max_request_bytes: int):
        self.app = app
        self.limit = max_request_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id

        async def correlated_send(message: Message) -> None:
            if message["type"] == "http.response.start":
                message["headers"] = list(message.get("headers", [])) + [(b"x-request-id", request_id.encode("ascii"))]
            await send(message)

        applies = scope.get("path") == "/api/analyze" and scope.get("method") == "POST"
        if not applies:
            await self.app(scope, receive, correlated_send)
            return
        lengths = [value for key, value in scope.get("headers", []) if key.lower() == b"content-length"]
        error = None
        if lengths:
            try:
                if len(lengths) != 1 or not lengths[0].isdigit():
                    raise ValueError
                length = int(lengths[0])
                if length > self.limit:
                    error = ApiError(413, "request_too_large", "Multipart request exceeds the configured size limit.")
            except ValueError:
                error = ApiError(400, "invalid_content_length", "Content-Length must be one nonnegative integer.")
        if error:
            response = JSONResponse(error_payload(error, request_id).model_dump(mode="json"), status_code=error.status_code)
            await response(scope, receive, correlated_send)
            return
        received = 0

        async def bounded_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.limit:
                    raise MultiPartException(BODY_LIMIT_DETAIL)
            return message

        await self.app(scope, bounded_receive, correlated_send)
