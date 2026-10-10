"""One independent analysis run; no UI, HTTP services, or automatic file writes."""

from dataclasses import asdict, dataclass
from importlib.metadata import version
from time import perf_counter

import pandas as pd
from sklearn.cluster import KMeans

from .cleaning import CleaningReport, clean_transactions
from .clustering import CandidateScore, EvaluationResult, evaluate_candidates, fit_kmeans, score_model, validate_k
from .ingestion import Source, load_transactions, normalize_transactions
from .personas import interpret_personas
from .preprocessing import FeatureRepresentation, PreprocessingMode, fit_preprocessing
from .profiling import profile_clusters
from .projection import PCAResult, project_pca
from .rfm import compute_rfm


@dataclass(frozen=True)
class PipelineConfig:
    """Explicit selection, independent candidates, and reproducible scoring."""

    selected_k: int = 4
    candidate_ks: tuple[int, ...] = (2, 3, 4, 5, 6)
    preprocessing: PreprocessingMode = "baseline"
    silhouette_sample_size: int = 1000
    date_format: str | None = None


@dataclass(frozen=True)
class PipelineResult:
    """Business results, diagnostics, fitted objects, and reproducibility metadata."""

    customers: pd.DataFrame
    cluster_profiles: pd.DataFrame
    personas: pd.DataFrame
    cleaning_report: CleaningReport
    reference_timestamp: pd.Timestamp
    representation: FeatureRepresentation
    model: KMeans
    pca: PCAResult
    evaluation: EvaluationResult
    selected_metrics: CandidateScore
    metadata: dict


def run_pipeline(source: Source | pd.DataFrame, config: PipelineConfig | None = None) -> PipelineResult:
    """Analyze CSV/XLSX or a DataFrame while preserving the original inputs.

    Invalid selected K is a structured error. Invalid evaluation candidates are
    explanatory records. Neither a recommended K nor fallback data replaces the
    user's selected K. Fitted candidate models can be reused for the selection.
    """
    started = perf_counter()
    config = config or PipelineConfig()
    loaded = normalize_transactions(source, date_format=config.date_format) if isinstance(source, pd.DataFrame) else load_transactions(source, date_format=config.date_format)
    cleaned, report = clean_transactions(loaded)
    rfm = compute_rfm(cleaned)
    representation = fit_preprocessing(rfm.customers, config.preprocessing)
    matrix = representation.matrix
    validate_k(matrix, config.selected_k)
    evaluation = evaluate_candidates(matrix, config.candidate_ks, sample_size=config.silhouette_sample_size)
    model = evaluation.models.get(config.selected_k)
    if model is None:
        model = fit_kmeans(matrix, config.selected_k)
    selected_metrics = next((s for s in evaluation.candidates if s.k == config.selected_k), None)
    if selected_metrics is None:
        selected_metrics = score_model(matrix, model, sample_size=config.silhouette_sample_size)
    pca = project_pca(matrix)
    customers = rfm.customers.copy(deep=True)
    customers["Cluster"] = model.labels_
    customers[["PC1", "PC2"]] = pca.coordinates
    profiles = profile_clusters(customers)
    personas = interpret_personas(customers)
    metadata = {
        "config": asdict(config), "reference_timestamp": rfm.reference_timestamp.isoformat(),
        "input_rows": report.input_rows, "cleaned_rows": report.cleaned_rows,
        "customer_count": len(customers), "total_monetary": float(customers.Monetary.sum()),
        "selected_k": config.selected_k, "recommended_k": evaluation.recommended_k,
        "kmeans": {"init": "k-means++", "random_state": 42, "n_init": 10},
        "silhouette_sampling": {"strategy": "uniform without replacement; same subset for every K", "seed": 42, "maximum_customers": config.silhouette_sample_size},
        "purchase_policy": "Positive retained purchases; excludes returns and is not true net revenue.",
        "timestamp_policy": "UTC-normalized naive timestamps; naive source timestamps treated as UTC.",
        "versions": {name: version(name) for name in ("numpy", "pandas", "scikit-learn", "openpyxl")},
        "elapsed_seconds": perf_counter() - started,
    }
    return PipelineResult(customers, profiles, personas, report, rfm.reference_timestamp, representation, model, pca, evaluation, selected_metrics, metadata)
