
"""Application factory and local uvicorn entry point."""

import logging
import sys

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException

from .config import Settings
from .errors import ApiError, api_error_handler
from .middleware import BODY_LIMIT_DETAIL, RequestBudgetMiddleware
from .routes import analysis, health
from .schemas import ErrorIssue
from .services.analysis_service import AnalysisService


# ------------------------------------------------------------
# Backend diagnostic logging
# ------------------------------------------------------------

analysis_logger = logging.getLogger("segmentiq.backend")
analysis_logger.setLevel(logging.INFO)

if not analysis_logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s [%(name)s] %(message)s"
        )
    )
    analysis_logger.addHandler(handler)

# Prevent duplicate messages through the root logger.
analysis_logger.propagate = False


# ------------------------------------------------------------
# FastAPI application
# ------------------------------------------------------------

def create_app(settings: Settings | None = None) -> FastAPI:
    """Construct one local service with explicit origins and workload limits."""

    settings = settings or Settings.from_env()

    app = FastAPI(
        title="SegmentIQ Analysis API",
        version="1.0.0",
        description=(
            "Synchronous local RFM segmentation. "
            "No database, accounts, or background jobs."
        ),
    )

    app.state.settings = settings
    app.state.analysis_service = AnalysisService(settings)

    app.add_exception_handler(ApiError, api_error_handler)

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        if exc.detail == BODY_LIMIT_DETAIL:
            return await api_error_handler(
                request,
                ApiError(
                    413,
                    "request_too_large",
                    "Multipart request exceeds the configured size limit.",
                ),
            )

        response = await api_error_handler(
            request,
            ApiError(
                exc.status_code,
                "http_error",
                str(exc.detail),
            ),
        )

        if exc.headers:
            response.headers.update(exc.headers)

        return response

    @app.exception_handler(RequestValidationError)
    async def request_error(request: Request, exc: RequestValidationError):
        issues = [
            ErrorIssue(
                code=e["type"],
                message=e["msg"],
                location=list(e["loc"]),
            )
            for e in exc.errors()
        ]

        return await api_error_handler(
            request,
            ApiError(
                422,
                "invalid_request",
                "Request validation failed.",
                issues=issues,
            ),
        )

    # Register API routes.
    app.include_router(health.router)
    app.include_router(analysis.router)

    # Enforce request-size limits.
    app.add_middleware(
        RequestBudgetMiddleware,
        max_request_bytes=settings.max_request_bytes,
    )

    # Configure allowed frontend origins.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    return app


app = create_app()
