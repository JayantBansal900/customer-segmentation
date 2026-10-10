import numpy as np
import pytest

from segmentation.projection import project_pca
from segmentation.preprocessing import fit_preprocessing


@pytest.mark.parametrize("mode", ["baseline", "log1p"])
def test_pca_matches_fitted_representation(mode, rfm):
    representation = fit_preprocessing(rfm, mode)
    result = project_pca(representation.matrix)
    assert result.coordinates.shape == (6, 2)
    assert result.reason is None
    assert all(0 <= ratio <= 1 for ratio in result.explained_variance_ratio)
    assert sum(result.explained_variance_ratio) <= 1 + 1e-12
    np.testing.assert_allclose(result.coordinates, result.model.transform(representation.matrix), atol=1e-12)
    np.testing.assert_allclose(result.model.explained_variance_ratio_, result.explained_variance_ratio)


@pytest.mark.parametrize("matrix", [np.ones((1, 3)), np.ones((3, 1)), np.ones((4, 3))])
def test_unavailable_pca_is_explanatory(matrix):
    result = project_pca(matrix)
    assert result.coordinates.shape == (len(matrix), 2)
    assert np.isnan(result.coordinates).all()
    assert result.explained_variance_ratio == (None, None)
    assert result.model is None
    assert result.reason


def test_rank_one_pca_has_zero_second_variance():
    result = project_pca(np.array([[0., 0., 0.], [1., 1., 1.], [2., 2., 2.]]))
    assert result.explained_variance_ratio[0] == pytest.approx(1)
    assert result.explained_variance_ratio[1] == pytest.approx(0, abs=1e-12)
