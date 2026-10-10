"""SegmentIQ purchase-only analysis engine; importing performs no analysis."""

from .errors import AnalysisValidationError, ValidationIssue
from .pipeline import PipelineConfig, PipelineResult, run_pipeline

__all__ = ["AnalysisValidationError", "ValidationIssue", "PipelineConfig", "PipelineResult", "run_pipeline"]
