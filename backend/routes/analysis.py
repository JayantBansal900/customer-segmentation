
"""Bounded multipart handling; all analytics are delegated to the engine."""

import logging
from time import perf_counter

from fastapi import APIRouter, Request
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import UploadFile
from starlette.exceptions import HTTPException
from starlette.responses import Response

from segmentation import AnalysisValidationError

from ..errors import ApiError
from ..schemas import (
    AnalysisParameters,
    AnalysisResponse,
    ErrorIssue,
    ErrorResponse,
    multipart_schema,
)

logger = logging.getLogger("segmentiq.backend")

router = APIRouter(prefix="/api", tags=["analysis"])

ERROR_RESPONSES = {
    code: {"model": ErrorResponse}
    for code in (400, 413, 422, 500, 503)
}


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    responses=ERROR_RESPONSES,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": multipart_schema()
                }
            },
        }
    },
)
async def analyze(request: Request) -> Response:
    """Analyze one CSV/XLSX upload or the explicitly selected built-in example."""

    request_id = request.state.request_id

    if request.url.query:
        raise ApiError(
            400,
            "unsupported_query",
            "Analysis parameters belong in multipart form fields; query parameters are unsupported.",
        )

    content_type = request.headers.get("content-type", "")
    if content_type.split(";", 1)[0].strip().lower() != "multipart/form-data":
        raise ApiError(
            400,
            "unsupported_content_type",
            "Use multipart/form-data for analysis requests.",
        )

    service = request.app.state.analysis_service

    if not service.capacity.acquire(blocking=False):
        logger.warning(
            "Analysis capacity busy (request_id=%s)",
            request_id,
        )
        raise ApiError(
            503,
            "analysis_busy",
            "Analysis capacity is busy; retry after the active request completes.",
            stage="analysis",
        )

    started = perf_counter()

    logger.info(
        "Analysis capacity acquired (request_id=%s)",
        request_id,
    )

    try:
        async with request.form(
            max_files=1,
            max_fields=8,
            max_part_size=16 * 1024,
        ) as form:

            if len(form.keys()) != len(form.multi_items()):
                raise ApiError(
                    400,
                    "duplicate_form_fields",
                    "Each multipart field may appear only once.",
                )

            upload = form.get("file")

            if upload is not None and not isinstance(upload, UploadFile):
                raise ApiError(
                    400,
                    "invalid_file_part",
                    "The file field must be an uploaded file.",
                )

            if any(
                isinstance(value, UploadFile) and key != "file"
                for key, value in form.multi_items()
            ):
                raise ApiError(
                    400,
                    "unsupported_file_field",
                    "The uploaded file field must be named file.",
                )

            fields = {
                key: value
                for key, value in form.items()
                if key != "file"
            }

            try:
                parameters = AnalysisParameters.model_validate(fields)

            except ValidationError as exc:
                issues = [
                    ErrorIssue(
                        code=error["type"],
                        message=error["msg"],
                        location=["body", *error["loc"]],
                    )
                    for error in exc.errors(
                        include_input=False,
                        include_context=False,
                        include_url=False,
                    )
                ]

                raise ApiError(
                    422,
                    "invalid_configuration",
                    "Analysis configuration is invalid.",
                    issues=issues,
                ) from exc

            if parameters.use_example and upload is not None:
                raise ApiError(
                    400,
                    "conflicting_sources",
                    "Choose an uploaded file or use_example=true, not both.",
                )

            if not parameters.use_example and upload is None:
                raise ApiError(
                    400,
                    "missing_file",
                    "Upload a file or explicitly set use_example=true.",
                )

            logger.info(
                "Analysis processing started (request_id=%s)",
                request_id,
            )

            body = await run_in_threadpool(
                service.analyze,
                parameters,
                upload,
                request_id,
            )

            logger.info(
                "Analysis processing completed (request_id=%s, elapsed_seconds=%.2f)",
                request_id,
                perf_counter() - started,
            )

            # Pydantic validation and JSON serialization occur in the worker.
            return Response(
                content=body,
                media_type="application/json",
            )

    except (ApiError, HTTPException):
        raise

    except AnalysisValidationError as exc:
        malformed = {
            "unsupported_format",
            "read_error",
            "duplicate_columns",
            "invalid_csv_row",
        }

        status = (
            400
            if any(issue.code in malformed for issue in exc.issues)
            else 422
        )

        issues = [
            ErrorIssue(
                code=issue.code,
                message=issue.message,
                column=issue.column,
                rows=list(issue.rows),
            )
            for issue in exc.issues
        ]

        raise ApiError(
            status,
            "analysis_validation_error",
            "Dataset or analysis parameters failed validation.",
            stage=exc.stage,
            issues=issues,
            context=exc.context,
        ) from exc

    except Exception as exc:
        # Avoid logging exception messages: they may contain customer values.
        trace = exc.__traceback__
        location = "unknown"

        while trace is not None:
            location = trace.tb_frame.f_code.co_name
            trace = trace.tb_next

        logger.error(
            "Analysis failed (type=%s, location=%s, request_id=%s)",
            type(exc).__name__,
            location,
            request_id,
        )

        raise ApiError(
            500,
            "internal_error",
            "Analysis failed unexpectedly.",
            stage="analysis",
        ) from exc

    finally:
        service.capacity.release()

        logger.info(
            "Analysis capacity released (request_id=%s, elapsed_seconds=%.2f)",
            request_id,
            perf_counter() - started,
        )
