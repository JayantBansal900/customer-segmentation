"""Version 1 multipart parameters and JSON contracts for the future frontend."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .config import MAX_CANDIDATES, MAX_K

ApiPreprocessing = Literal["raw_standard", "log1p_standard"]


class ApiModel(BaseModel):
    """Unknown fields and nonfinite JSON numbers are not accepted."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class AnalysisParameters(ApiModel):
    """Multipart text fields; file/example exclusivity is checked separately."""

    selected_k: int = Field(ge=2, le=MAX_K, description="Chosen cluster count; never replaced by recommendation.")
    candidate_k_min: int = Field(ge=2, le=MAX_K, description="Inclusive candidate lower bound.")
    candidate_k_max: int = Field(ge=2, le=MAX_K, description="Inclusive candidate upper bound.")
    preprocessing: ApiPreprocessing = Field(default="raw_standard", description="Maps to baseline/log1p in the existing engine.")
    use_example: bool = Field(default=False, description="Use the bundled Online Retail.xlsx instead of a file.")
    date_format: str | None = Field(default=None, max_length=100, description="Explicit format for non-ISO uploaded dates, e.g. %d/%m/%Y.")

    @model_validator(mode="after")
    def candidate_bounds(self) -> "AnalysisParameters":
        if self.candidate_k_max < self.candidate_k_min:
            raise ValueError("candidate_k_max must be >= candidate_k_min")
        if self.candidate_k_max - self.candidate_k_min + 1 > MAX_CANDIDATES:
            raise ValueError(f"At most {MAX_CANDIDATES} consecutive candidate K values are supported")
        return self


def multipart_schema() -> dict:
    """Generate OpenAPI request properties from the same validated model."""
    schema = AnalysisParameters.model_json_schema()
    schema["properties"]["file"] = {"type": "string", "format": "binary", "description": "CSV or XLSX; mutually exclusive with use_example=true."}
    schema["oneOf"] = [
        {"required": ["file"], "properties": {"use_example": {"const": False}}},
        {"required": ["use_example"], "properties": {"use_example": {"const": True}}, "not": {"required": ["file"]}},
    ]
    return schema


class HealthResponse(ApiModel):
    """Availability only; no nonexistent infrastructure health claims."""

    status: Literal["ok"] = "ok"
    service: Literal["segmentiq"] = "segmentiq"
    api_version: Literal["1"] = "1"


class ErrorIssue(ApiModel):
    code: str
    message: str
    column: str | None = None
    rows: list[int] = Field(default_factory=list)
    location: list[str | int] = Field(default_factory=list)


class ErrorDetail(ApiModel):
    code: str
    message: str
    stage: str
    issues: list[ErrorIssue] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)
    request_id: str


class ErrorResponse(ApiModel):
    error: ErrorDetail


class AnalysisMetadata(ApiModel):
    api_version: Literal["1"] = "1"
    request_id: str
    dataset_source: Literal["upload", "example"]
    dataset_name: str
    input_rows: int
    cleaned_rows: int
    customer_count: int
    reference_timestamp: str
    preprocessing: ApiPreprocessing
    engine_preprocessing: Literal["baseline", "log1p"]
    selected_k: int
    recommended_k: int | None
    total_monetary: float
    purchase_policy: str
    timestamp_policy: str
    package_versions: dict[str, str]
    pipeline_elapsed_seconds: float
    analysis_elapsed_seconds: float


class CleaningSummary(ApiModel):
    input_rows: int
    missing_customer_ids: int
    cancellation_lines: int
    nonpositive_quantities: int
    nonpositive_prices: int
    exact_duplicates: int
    excluded_rows: int
    cleaned_rows: int
    retained_customers: int


class CandidateQuality(ApiModel):
    k: int
    inertia: float | None
    silhouette: float | None
    silhouette_sample_size: int
    status: Literal["ok", "unavailable", "invalid"]
    reason: str | None


class PCAQuality(ApiModel):
    pc1_explained_variance_ratio: float | None
    pc2_explained_variance_ratio: float | None
    reason: str | None


class SilhouetteSampling(ApiModel):
    strategy: str
    seed: int
    maximum_customers: int


class ModelQuality(ApiModel):
    selected: CandidateQuality
    candidates: list[CandidateQuality]
    recommendation_explanation: str
    silhouette_sampling: SilhouetteSampling
    pca: PCAQuality


class CustomerResult(ApiModel):
    customer_id: str
    recency: int
    frequency: int
    monetary: float
    cluster_id: int
    pc1: float | None
    pc2: float | None
    persona: str | None
    persona_description: str | None


class RFMProfile(ApiModel):
    recency: float
    frequency: float
    monetary: float


class SegmentResult(ApiModel):
    cluster_id: int
    customer_count: int
    customer_percentage: float
    monetary: float
    monetary_contribution_percentage: float
    mean_rfm: RFMProfile
    median_rfm: RFMProfile
    persona: str | None
    persona_description: str | None
    recommendations: list[str] | None = None


class AnalysisResponse(ApiModel):
    metadata: AnalysisMetadata
    cleaning: CleaningSummary
    model_quality: ModelQuality
    customers: list[CustomerResult]
    segments: list[SegmentResult]
