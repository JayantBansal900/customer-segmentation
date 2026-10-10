import numpy as np
import pandas as pd
import pytest
from sklearn.preprocessing import StandardScaler

from segmentation.errors import AnalysisValidationError
from segmentation.preprocessing import fit_preprocessing


@pytest.mark.parametrize("mode", ["baseline", "log1p"])
def test_transform_matches_definition_and_preserves_raw(mode, rfm):
    original = rfm.copy(deep=True)
    values = rfm[["Recency", "Frequency", "Monetary"]].to_numpy(dtype=float)
    expected = StandardScaler().fit_transform(values if mode == "baseline" else np.log1p(values))
    result = fit_preprocessing(rfm, mode)
    np.testing.assert_allclose(result.matrix, expected)
    np.testing.assert_allclose(result.matrix.mean(axis=0), 0, atol=1e-12)
    pd.testing.assert_frame_equal(rfm, original)


def test_reuse_does_not_refit(rfm):
    result = fit_preprocessing(rfm, "log1p")
    fitted_mean = result.scaler.mean_.copy()
    new = rfm.iloc[:2].copy()
    expected = result.scaler.transform(np.log1p(new[["Recency", "Frequency", "Monetary"]].to_numpy(dtype=float)))
    np.testing.assert_allclose(result.transform(new), expected)
    np.testing.assert_array_equal(result.scaler.mean_, fitted_mean)


def test_representations_are_distinct(rfm):
    assert not np.allclose(fit_preprocessing(rfm).matrix, fit_preprocessing(rfm, "log1p").matrix)


@pytest.mark.parametrize("value", [-1, np.nan, np.inf])
def test_invalid_features(value, rfm):
    rfm["Monetary"] = rfm.Monetary.astype(float)
    rfm.loc[0, "Monetary"] = value
    with pytest.raises(AnalysisValidationError):
        fit_preprocessing(rfm, "log1p")


def test_unknown_mode(rfm):
    with pytest.raises(AnalysisValidationError) as caught:
        fit_preprocessing(rfm, "automatic")
    assert caught.value.issues[0].code == "invalid_preprocessing"
