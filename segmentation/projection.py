"""PCA for visualization of the same representation used by KMeans."""

from dataclasses import dataclass

import numpy as np
from sklearn.decomposition import PCA

from .clustering import validate_matrix


@dataclass(frozen=True)
class PCAResult:
    """Two display coordinates and variance, or unavailable values plus reason."""

    coordinates: np.ndarray
    explained_variance_ratio: tuple[float | None, float | None]
    model: PCA | None
    reason: str | None = None


def project_pca(matrix: np.ndarray) -> PCAResult:
    """Fit two components without using the projection for cluster fitting."""
    values = validate_matrix(matrix)
    if min(values.shape) < 2:
        return PCAResult(np.full((len(values), 2), np.nan), (None, None), None, "Two PCA components require at least two customers and two features.")
    if np.all(values == values[0]):
        return PCAResult(np.full((len(values), 2), np.nan), (None, None), None, "PCA explained variance is undefined for constant features.")
    model = PCA(n_components=2, svd_solver="full")
    coordinates = model.fit_transform(values)
    return PCAResult(coordinates, tuple(float(v) for v in model.explained_variance_ratio_), model)
