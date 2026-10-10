"""Explicit baseline/log1p representations; raw business features stay intact."""

from dataclasses import dataclass
from typing import Literal

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from .errors import invalid
from .rfm import FEATURES

PreprocessingMode = Literal["baseline", "log1p"]


def raw_features(rfm: pd.DataFrame) -> np.ndarray:
    """Extract finite nonnegative RFM, raising a structured input error."""
    if not set(FEATURES).issubset(rfm.columns) or rfm.empty:
        raise invalid("invalid_rfm", "Expected nonempty Recency, Frequency, Monetary columns.", stage="preprocessing")
    try:
        values = rfm[list(FEATURES)].to_numpy(dtype=float)
    except (TypeError, ValueError) as exc:
        raise invalid("invalid_rfm", "RFM values must be numeric.", stage="preprocessing") from exc
    if not np.isfinite(values).all() or (values < 0).any():
        raise invalid("invalid_rfm", "RFM values must be finite and nonnegative.", stage="preprocessing")
    return values


@dataclass(frozen=True)
class FeatureRepresentation:
    """The run's transformed matrix and fitted scaler for consistent reuse."""

    mode: PreprocessingMode
    matrix: np.ndarray
    scaler: StandardScaler

    def transform(self, rfm: pd.DataFrame) -> np.ndarray:
        """Apply this fitted representation without refitting or changing RFM."""
        values = raw_features(rfm)
        if self.mode == "log1p":
            values = np.log1p(values)
        transformed = self.scaler.transform(values)
        if not np.isfinite(transformed).all():
            raise invalid("transform_overflow", "Transformed features exceed finite numeric range.", stage="preprocessing")
        return transformed


def fit_preprocessing(rfm: pd.DataFrame, mode: PreprocessingMode = "baseline") -> FeatureRepresentation:
    """Fit StandardScaler(raw RFM) or StandardScaler(log1p(raw RFM))."""
    if mode not in {"baseline", "log1p"}:
        raise invalid("invalid_preprocessing", "Preprocessing must be baseline or log1p.", stage="preprocessing")
    values = raw_features(rfm)
    if mode == "log1p":
        values = np.log1p(values)
    scaler = StandardScaler()
    with np.errstate(over="ignore", invalid="ignore", divide="ignore"):
        matrix = scaler.fit_transform(values)
    if not np.isfinite(matrix).all():
        raise invalid("transform_overflow", "Scaled features exceed finite numeric range.", stage="preprocessing")
    return FeatureRepresentation(mode, matrix, scaler)
