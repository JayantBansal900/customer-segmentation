from io import StringIO
import json

import numpy as np
import pandas as pd
import pytest

from segmentation import AnalysisValidationError, PipelineConfig, run_pipeline


@pytest.mark.parametrize("mode", ["baseline", "log1p"])
def test_end_to_end_business_output(mode, transactions):
    original = transactions.copy(deep=True)
    result = run_pipeline(transactions, PipelineConfig(selected_k=2, preprocessing=mode, candidate_ks=(2, 3)))
    assert result.customers.columns.tolist() == ["CustomerID", "Recency", "Frequency", "Monetary", "Cluster", "PC1", "PC2"]
    assert result.cleaning_report.input_rows == 12
    assert result.cleaning_report.cleaned_rows == 12
    assert result.cleaning_report.retained_customers == 6
    assert result.reference_timestamp == pd.Timestamp("2020-01-21T12:00:00")
    assert result.customers.Monetary.sum() == 837
    assert result.customers.Frequency.tolist() == [2] * 6
    assert result.customers.set_index("CustomerID").loc["0001", "Recency"] == 20
    assert result.customers.set_index("CustomerID").loc["0001", "Monetary"] == 6
    assert result.metadata["selected_k"] == 2
    assert result.metadata["recommended_k"] in (2, 3)
    assert result.metadata["total_monetary"] == 837
    assert result.cluster_profiles.CustomerCount.sum() == 6
    assert result.cluster_profiles.CustomerPercentage.sum() == pytest.approx(100)
    assert result.cluster_profiles.RevenueContributionPercentage.sum() == pytest.approx(100)
    assert len(result.personas) == 2
    np.testing.assert_allclose(result.customers[["PC1", "PC2"]], result.pca.model.transform(result.representation.matrix), atol=1e-12)
    assert result.model.n_features_in_ == 3
    assert result.model is result.evaluation.models[2]
    pd.testing.assert_frame_equal(transactions, original)
    json.dumps(result.metadata)


def test_csv_pipeline(transactions):
    stream = StringIO(transactions.to_csv(index=False))
    stream.name = "input.csv"
    result = run_pipeline(stream, PipelineConfig(selected_k=2))
    assert result.customers.Monetary.sum() == 837
    assert "0001" in result.customers.CustomerID.tolist()


def test_selection_outside_evaluation_is_preserved(transactions):
    result = run_pipeline(transactions, PipelineConfig(selected_k=3, candidate_ks=(2,)))
    assert result.model.n_clusters == 3
    assert result.metadata["selected_k"] == 3
    assert result.metadata["recommended_k"] == 2
    assert result.selected_metrics.k == 3


def test_selected_k_is_not_silently_replaced(transactions):
    with pytest.raises(AnalysisValidationError) as caught:
        run_pipeline(transactions, PipelineConfig(selected_k=7))
    assert caught.value.issues[0].code == "invalid_k"


def test_two_customer_pipeline_without_recommendation(transactions):
    small = transactions.iloc[[0, 2]].copy()
    result = run_pipeline(small, PipelineConfig(selected_k=2, candidate_ks=(2, 3, 4)))
    assert result.metadata["customer_count"] == 2
    assert result.metadata["recommended_k"] is None
    assert result.selected_metrics.silhouette is None
    assert len(result.customers.Cluster.unique()) == 2
    assert result.pca.coordinates.shape == (2, 2)


def test_single_customer_pipeline_error_is_structured(transactions):
    with pytest.raises(AnalysisValidationError) as caught:
        run_pipeline(transactions.iloc[:1], PipelineConfig(selected_k=2))
    assert caught.value.stage == "clustering"


def test_empty_pipeline_error_is_structured(transactions):
    with pytest.raises(AnalysisValidationError) as caught:
        run_pipeline(transactions.iloc[:0])
    assert caught.value.issues[0].code == "empty_input"


def test_original_four_customer_example_now_completes():
    example = pd.DataFrame({
        "InvoiceNo": ["1001", "1001", "1002", "1003", "1004"],
        "Quantity": [2, 3, 1, 5, 2],
        "InvoiceDate": pd.to_datetime(["2020-01-01", "2020-01-01", "2020-01-02", "2020-01-03", "2020-01-04"]),
        "UnitPrice": [10, 15, 7, 10, 20], "CustomerID": [1001, 1001, 1002, 1003, 1004],
    })
    result = run_pipeline(example)
    assert result.metadata["selected_k"] == 4
    assert result.metadata["customer_count"] == 4
    assert result.customers.Monetary.sum() == 162
    assert result.selected_metrics.silhouette is None
    scores = {s.k: s for s in result.evaluation.candidates}
    assert scores[4].status == "unavailable"
    assert scores[5].status == scores[6].status == "invalid"
    assert result.evaluation.recommended_k in (2, 3)
