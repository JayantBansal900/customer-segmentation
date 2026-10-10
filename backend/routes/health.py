"""Simple availability endpoint."""

from fastapi import APIRouter

from ..schemas import HealthResponse

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Report this process's availability only."""
    return HealthResponse()
