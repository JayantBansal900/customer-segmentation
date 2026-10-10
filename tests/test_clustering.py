import numpy as np
import pytest
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

from segmentation.clustering import evaluate_candidates, fit_kmeans, score_model
from segmentation.errors import AnalysisValidationError


def test_reproducibility_and_explicit_parameters(features):
    first = fit_kmeans(features, 2)
    second = fit_kmeans(features, 2)
    np.testing.assert_array_equal(first.labels_, second.labels_)
    np.testing.assert_allclose(first.cluster_centers_, second.cluster_centers_)
    assert first.init == "k-means++"
    assert first.random_state == 42
    assert first.n_init == 10
    assert first.labels_[0] == first.labels_[1] == first.labels_[2]
    assert first.labels_[3] == first.labels_[4] == first.labels_[5]
    assert first.labels_[0] != first.labels_[3]


@pytest.mark.parametrize("k", [0, 1, -1, 7, True, 2.5])
def test_invalid_k(k, features):
    with pytest.raises(AnalysisValidationError) as caught:
        fit_kmeans(features, k)
    assert caught.value.issues[0].code == "invalid_k"


def test_k_cannot_exceed_distinct_vectors():
    with pytest.raises(AnalysisValidationError):
        fit_kmeans(np.array([[0., 0.], [0., 0.], [1., 1.], [1., 1.]]), 3)


def test_single_customer_evaluation_explains_unavailability():
    result = evaluate_candidates(np.array([[1., 2., 3.]]), [2, 3])
    assert result.recommended_k is None
    assert [s.status for s in result.candidates] == ["invalid", "invalid"]
    assert all(s.reason for s in result.candidates)


def test_identical_vectors_do_not_invent_clusters():
    result = evaluate_candidates(np.ones((4, 3)), [2, 3])
    assert result.recommended_k is None
    assert not result.models


def test_two_customers_silhouette_unavailable():
    result = evaluate_candidates(np.array([[0., 0.], [1., 1.]]), [2])
    assert result.candidates[0].inertia == 0
    assert result.candidates[0].silhouette is None
    assert result.candidates[0].status == "unavailable"
    assert result.recommended_k is None


def test_recommendation_and_invalid_candidates(features):
    result = evaluate_candidates(features, [1, 2, 3, 6, 7])
    assert result.recommended_k == 2
    assert result.candidates[0].status == "invalid"
    assert result.candidates[3].silhouette is None
    assert result.candidates[4].status == "invalid"
    assert result.candidates[1].silhouette > .98


def test_sample_reproducibility(features):
    model = fit_kmeans(features, 2)
    result = score_model(features, model, sample_size=4)
    indices = np.random.RandomState(42).choice(6, 4, replace=False)
    expected = silhouette_score(features[indices], model.labels_[indices])
    assert result.silhouette_sample_size == 4
    assert result.silhouette == pytest.approx(expected)
    assert result == score_model(features, model, sample_size=4)


def test_sample_lacking_label_diversity_is_explained(features):
    result = score_model(features, fit_kmeans(features, 2), sample_size=2)
    assert result.silhouette is None
    assert "sample" in result.reason.lower()


def test_empty_candidates_are_explanatory(features):
    result = evaluate_candidates(features, [])
    assert result.recommended_k is None
    assert result.candidates == ()


@pytest.mark.parametrize("sample", [0, 1, True, 2.5])
def test_invalid_sample_size(sample, features):
    with pytest.raises(AnalysisValidationError) as caught:
        evaluate_candidates(features, [2], sample_size=sample)
    assert caught.value.issues[0].code == "invalid_sample_size"


def test_invalid_matrix():
    with pytest.raises(AnalysisValidationError) as caught:
        evaluate_candidates(np.array([[np.inf, 1]]), [2])
    assert caught.value.issues[0].code == "invalid_features"


def test_unfitted_or_mismatched_model(features):
    for model, matrix in [(KMeans(n_clusters=2), features), (fit_kmeans(features, 2), features[:3])]:
        with pytest.raises(AnalysisValidationError) as caught:
            score_model(matrix, model)
        assert caught.value.issues[0].code == "model_matrix_mismatch"
