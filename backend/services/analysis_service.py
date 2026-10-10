"""Thin file-validation and serialization adapter; no duplicated ML logic."""

from dataclasses import asdict
from math import isfinite
from pathlib import PurePosixPath
from threading import BoundedSemaphore
from time import perf_counter
from typing import BinaryIO
from xml.etree.ElementTree import ParseError
from zipfile import BadZipFile, ZipFile, is_zipfile

from openpyxl.utils.exceptions import InvalidFileException
from openpyxl.xml import DEFUSEDXML
from openpyxl.xml.functions import iterparse
from defusedxml.common import DefusedXmlException
from defusedxml.ElementTree import iterparse as safe_iterparse
from starlette.datastructures import UploadFile

from segmentation import AnalysisValidationError, PipelineConfig, PipelineResult, run_pipeline
from segmentation.ingestion import load_transactions

from ..config import Settings
from ..errors import ApiError
from ..schemas import AnalysisMetadata, AnalysisParameters, AnalysisResponse, CandidateQuality, CleaningSummary, CustomerResult, ModelQuality, PCAQuality, RFMProfile, SegmentResult

PREPROCESSING_MAP = {"raw_standard": "baseline", "log1p_standard": "log1p"}


def nullable_number(value: object) -> float | None:
    """Serialize unavailable display metrics as null, never NaN or infinity."""
    if value is None:
        return None
    number = float(value)
    return number if isfinite(number) else None


def candidate_contract(score) -> CandidateQuality:
    """Rename nothing in the engine's candidate metric contract."""
    values = asdict(score)
    values["inertia"] = nullable_number(values["inertia"])
    values["silhouette"] = nullable_number(values["silhouette"])
    return CandidateQuality(**values)


def response_contract(result: PipelineResult, parameters: AnalysisParameters, *, dataset_source: str, dataset_name: str, request_id: str, elapsed_seconds: float) -> AnalysisResponse:
    """Map existing raw results to typed frontend fields; do not recalculate ML."""
    labels = {int(row.Cluster): (row.Persona, row.Description) for row in result.personas.itertuples(index=False)}
    customers = []
    for row in result.customers.itertuples(index=False):
        persona, description = labels.get(int(row.Cluster), (None, None))
        customers.append(CustomerResult(customer_id=str(row.CustomerID), recency=int(row.Recency),
            frequency=int(row.Frequency), monetary=float(row.Monetary), cluster_id=int(row.Cluster),
            pc1=nullable_number(row.PC1), pc2=nullable_number(row.PC2), persona=persona, persona_description=description))
    segments = []
    for row in result.cluster_profiles.itertuples(index=False):
        persona, description = labels.get(int(row.Cluster), (None, None))
        segments.append(SegmentResult(cluster_id=int(row.Cluster), customer_count=int(row.CustomerCount),
            customer_percentage=float(row.CustomerPercentage), monetary=float(row.Revenue),
            monetary_contribution_percentage=float(row.RevenueContributionPercentage),
            mean_rfm=RFMProfile(recency=row.MeanRecency, frequency=row.MeanFrequency, monetary=row.MeanMonetary),
            median_rfm=RFMProfile(recency=row.MedianRecency, frequency=row.MedianFrequency, monetary=row.MedianMonetary),
            persona=persona, persona_description=description))
    metadata = result.metadata
    return AnalysisResponse(
        metadata=AnalysisMetadata(request_id=request_id, dataset_source=dataset_source, dataset_name=dataset_name,
            input_rows=metadata["input_rows"], cleaned_rows=metadata["cleaned_rows"], customer_count=metadata["customer_count"],
            reference_timestamp=metadata["reference_timestamp"], preprocessing=parameters.preprocessing,
            engine_preprocessing=PREPROCESSING_MAP[parameters.preprocessing], selected_k=metadata["selected_k"],
            recommended_k=metadata["recommended_k"], total_monetary=metadata["total_monetary"],
            purchase_policy=metadata["purchase_policy"], timestamp_policy=metadata["timestamp_policy"],
            package_versions=metadata["versions"], pipeline_elapsed_seconds=metadata["elapsed_seconds"], analysis_elapsed_seconds=elapsed_seconds),
        cleaning=CleaningSummary(**asdict(result.cleaning_report), excluded_rows=result.cleaning_report.excluded_rows),
        model_quality=ModelQuality(selected=candidate_contract(result.selected_metrics),
            candidates=[candidate_contract(score) for score in result.evaluation.candidates],
            recommendation_explanation=result.evaluation.explanation, silhouette_sampling=metadata["silhouette_sampling"],
            pca=PCAQuality(pc1_explained_variance_ratio=nullable_number(result.pca.explained_variance_ratio[0]),
                pc2_explained_variance_ratio=nullable_number(result.pca.explained_variance_ratio[1]), reason=result.pca.reason)),
        customers=customers, segments=segments,
    )


class AnalysisService:
    """Per-app admission control and single-read engine execution."""

    def __init__(self, settings: Settings):
        if not DEFUSEDXML or iterparse is not safe_iterparse:
            raise RuntimeError("XLSX analysis requires active defusedxml parsing; install the declared security dependency and restart Python.")
        self.settings = settings
        self.capacity = BoundedSemaphore(settings.max_concurrent_analyses)

    def _validate_file(self, handle: BinaryIO, kind: str) -> None:
        handle.seek(0, 2)
        size = handle.tell()
        handle.seek(0)
        if size == 0:
            raise ApiError(400, "empty_file", "The uploaded file is empty.")
        if size > self.settings.max_upload_bytes:
            raise ApiError(413, "file_too_large", "File exceeds the configured upload size limit.")
        prefix = handle.read(16)
        handle.seek(0)
        if kind == "csv":
            if b"\x00" in prefix or prefix.startswith((b"PK", b"\xd0\xcf\x11\xe0", b"%PDF", b"\x89PNG", b"\x1f\x8b")):
                raise ApiError(400, "file_type_mismatch", "CSV uploads must contain UTF-8 CSV text, not a binary document.")
            return
        if not is_zipfile(handle):
            raise ApiError(400, "file_type_mismatch", "XLSX uploads must contain an Office Open XML workbook.")
        try:
            with ZipFile(handle) as archive:
                members = archive.infolist()
                names = {member.filename for member in members}
                if len(names) != len(members) or not {"[Content_Types].xml", "xl/workbook.xml"}.issubset(names) or any(member.flag_bits & 1 for member in members):
                    raise ApiError(400, "invalid_workbook", "Archive is not an unencrypted XLSX workbook.")
                if len(members) > 1000 or sum(member.file_size for member in members) > self.settings.max_xlsx_expanded_bytes:
                    raise ApiError(413, "workbook_expansion_limit", "Workbook exceeds the configured expanded archive budget.")
        except BadZipFile as exc:
            raise ApiError(400, "invalid_workbook", "Workbook archive is malformed.") from exc
        finally:
            handle.seek(0)

    def analyze(self, parameters: AnalysisParameters, upload: UploadFile | None, request_id: str) -> bytes:
        """Validate input, call the existing engine once, validate/serialize JSON.

        Called on a worker thread. Multipart owns and closes uploads; the trusted
        built-in workbook is opened read-only in this method's context manager.
        """
        started = perf_counter()
        if parameters.use_example:
            source = self.settings.example_dataset
            if not source.is_file():
                raise ApiError(503, "example_unavailable", "The built-in example dataset is unavailable.", stage="ingestion")
            with source.open("rb") as handle:
                self._validate_file(handle, "xlsx")
                frame = self._read(handle, "xlsx", parameters.date_format)
            dataset_source, dataset_name = "example", "Online Retail.xlsx"
        else:
            assert upload is not None  # Route has already enforced source exclusivity.
            dataset_name = PurePosixPath((upload.filename or "").replace("\\", "/")).name
            kind = PurePosixPath(dataset_name).suffix.lower().lstrip(".")
            if kind not in {"csv", "xlsx"}:
                raise ApiError(400, "unsupported_format", "Only CSV and XLSX uploads are supported.")
            self._validate_file(upload.file, kind)
            frame = self._read(upload.file, kind, parameters.date_format)
            dataset_source = "upload"
        config = PipelineConfig(selected_k=parameters.selected_k,
            candidate_ks=tuple(range(parameters.candidate_k_min, parameters.candidate_k_max + 1)),
            preprocessing=PREPROCESSING_MAP[parameters.preprocessing],
            silhouette_sample_size=self.settings.silhouette_sample_size, date_format=parameters.date_format)
        result = run_pipeline(frame, config)
        response = response_contract(result, parameters, dataset_source=dataset_source,
            dataset_name=dataset_name, request_id=request_id, elapsed_seconds=perf_counter() - started)
        return response.model_dump_json().encode("utf-8")

    @staticmethod
    def _read(handle: BinaryIO, kind: str, date_format: str | None):
        """Use existing ingestion; classify corrupt archive/XML reader failures."""
        try:
            return load_transactions(handle, file_format=kind, date_format=date_format)
        except AnalysisValidationError as exc:
            cause = exc.__cause__
            # openpyxl wraps XML security errors in ValueError before ingestion
            # wraps them again. Inspect explicit causes, never message text.
            while cause is not None and not isinstance(cause, DefusedXmlException):
                cause = cause.__cause__
            if isinstance(cause, DefusedXmlException):
                raise ApiError(400, "invalid_workbook", "Workbook XML contains prohibited entities or external references.", stage="ingestion") from exc
            raise
        except (BadZipFile, ParseError, InvalidFileException, KeyError, DefusedXmlException) as exc:
            raise ApiError(400, "invalid_workbook", "Workbook content is malformed.", stage="ingestion") from exc
