"""Deterministic KMeans and explanatory candidate/silhouette evaluation."""

from dataclasses import dataclass, field
from numbers import Integral
from typing import Iterable

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

from .errors import AnalysisValidationError, invalid


def validate_matrix(matrix: np.ndarray) -> np.ndarray:
    """Require a finite nonempty two-dimensional numeric feature matrix."""
    try:
        values = np.asarray(matrix, dtype=float)
    except (TypeError, ValueError) as exc:
        raise invalid("invalid_features", "Features must be numeric.", stage="clustering") from exc
    if values.ndim != 2 or 0 in values.shape or not np.isfinite(values).all():
        raise invalid("invalid_features", "Features must be a finite nonempty 2D matrix.", stage="clustering")
    return values


def validate_k(matrix: np.ndarray, k: int) -> None:
    """Reject invalid K without inventing replacement clusters.

    Selected K may equal customer count, though its silhouette is unavailable.
    Candidate recommendations require an actually valid silhouette score.
    """
    values = validate_matrix(matrix)
    distinct = len(np.unique(values, axis=0))
    if isinstance(k, bool) or not isinstance(k, Integral) or k < 2:
        raise invalid("invalid_k", "K must be an integer of at least 2.", stage="clustering")
    if k > len(values) or k > distinct:
        raise invalid("invalid_k", f"K={k} exceeds {len(values)} customers or {distinct} distinct feature vectors.", stage="clustering")


def fit_kmeans(matrix: np.ndarray, k: int) -> KMeans:
    """Fit only on the supplied RFM representation, never PCA coordinates."""
    validate_k(matrix, k)
    return KMeans(n_clusters=int(k), init="k-means++", random_state=42, n_init=10).fit(matrix)


@dataclass(frozen=True)
class CandidateScore:
    """A candidate's metrics or explicit reason they cannot be calculated."""

    k: int
    inertia: float | None
    silhouette: float | None
    silhouette_sample_size: int
    status: str
    reason: str | None = None


@dataclass(frozen=True)
class EvaluationResult:
    """Candidate comparison; recommendation remains independent of selection."""

    candidates: tuple[CandidateScore, ...]
    recommended_k: int | None
    explanation: str
    models: dict[int, KMeans] = field(repr=False)


def score_model(matrix: np.ndarray, model: KMeans, *, sample_size: int = 1000) -> CandidateScore:
    """Score a model with reproducible uniform sampling (seed 42).

    Use all customers if N <= sample_size. Otherwise use the same uniformly
    drawn customer subset for every K in a run. This bounds pairwise work, but
    may miss very small clusters; an invalid sampled label count is explained.
    """
    values = validate_matrix(matrix)
    if isinstance(sample_size, bool) or not isinstance(sample_size, Integral) or sample_size < 2:
        raise invalid("invalid_sample_size", "Silhouette sample_size must be an integer >= 2.", stage="evaluation")
    labels = getattr(model, "labels_", None)
    if labels is None or len(labels) != len(values) or model.n_features_in_ != values.shape[1]:
        raise invalid("model_matrix_mismatch", "Scoring requires a fitted model and its corresponding feature matrix.", stage="evaluation")
    n = len(values)
    actual = min(n, int(sample_size))
    count = len(np.unique(labels))
    reason = None
    if not 2 <= count <= n - 1:
        reason = f"Silhouette requires 2..N-1 labels; observed {count} labels for {n} customers."
    indices = np.arange(n) if actual == n else np.random.RandomState(42).choice(n, actual, replace=False)
    sampled_labels = labels[indices]
    if reason is None and not 2 <= len(np.unique(sampled_labels)) <= actual - 1:
        reason = "The reproducible sample has insufficient label diversity for silhouette."
    score = None if reason else float(silhouette_score(values[indices], sampled_labels))
    return CandidateScore(int(model.n_clusters), float(model.inertia_), score, actual, "ok" if score is not None else "unavailable", reason)


def evaluate_candidates(matrix: np.ndarray, candidate_ks: Iterable[int], *, sample_size: int = 1000) -> EvaluationResult:
    """Fit valid candidates and explain invalid ones; prefer highest silhouette.

    Ties are resolved by smaller K. No score means no recommendation. A numeric
    silhouette recommendation does not establish business usefulness.
    """
    values = validate_matrix(matrix)
    if isinstance(sample_size, bool) or not isinstance(sample_size, Integral) or sample_size < 2:
        raise invalid("invalid_sample_size", "Silhouette sample_size must be an integer >= 2.", stage="evaluation")
    scores: list[CandidateScore] = []
    models: dict[int, KMeans] = {}
    seen: set[int] = set()
    for k in candidate_ks:
        if isinstance(k, bool) or not isinstance(k, Integral):
            raise invalid("invalid_candidate", "Candidate K values must be integers.", stage="evaluation")
        k = int(k)
        if k in seen:
            continue
        seen.add(k)
        try:
            model = fit_kmeans(values, k)
        except AnalysisValidationError as exc:
            scores.append(CandidateScore(k, None, None, 0, "invalid", str(exc)))
            continue
        models[k] = model
        scores.append(score_model(values, model, sample_size=sample_size))
    valid = [s for s in scores if s.silhouette is not None]
    best = max(valid, key=lambda s: (s.silhouette, -s.k)) if valid else None
    explanation = "Highest valid silhouette; assess business usefulness and stability separately." if best else "No candidate has a mathematically valid silhouette; no K is recommended."
    return EvaluationResult(tuple(scores), best.k if best else None, explanation, models)
