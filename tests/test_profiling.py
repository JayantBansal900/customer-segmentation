import pandas as pd
import pytest

from segmentation.errors import AnalysisValidationError
from segmentation.personas import interpret_personas
from segmentation.profiling import profile_clusters


def test_summary_expected_values_and_reconciliation(rfm):
    rfm["Cluster"] = [7, 7, 7, 2, 2, 2]
    summary = profile_clusters(rfm).set_index("Cluster")
    assert summary.loc[7, "CustomerCount"] == 3
    assert summary.loc[7, "MeanRecency"] == 101
    assert summary.loc[7, "MedianFrequency"] == 1
    assert summary.loc[7, "MedianMonetary"] == 11
    assert summary.loc[2, "Revenue"] == 3300
    assert summary.loc[7, "RevenueContributionPercentage"] == pytest.approx(33 / 3333 * 100)
    assert summary.CustomerPercentage.sum() == pytest.approx(100)
    assert summary.RevenueContributionPercentage.sum() == pytest.approx(100)
    assert summary.Revenue.sum() == pytest.approx(rfm.Monetary.sum())


def test_personas_describe_values_and_ignore_label_numbers(rfm):
    rfm["Cluster"] = [7, 7, 7, 2, 2, 2]
    first = interpret_personas(rfm).set_index("Cluster")
    assert first.loc[2, "Persona"] == "More recent, Higher invoice frequency, Higher purchase value"
    assert first.loc[7, "Persona"] == "Less recent, Lower invoice frequency, Lower purchase value"
    changed = rfm.copy()
    changed["Cluster"] = changed.Cluster.map({7: 100, 2: 200})
    second = interpret_personas(changed).set_index("Cluster")
    assert second.loc[200, "Persona"] == first.loc[2, "Persona"]
    assert second.loc[100, "Persona"] == first.loc[7, "Persona"]


def test_equal_profiles_are_typical(rfm):
    rfm["Cluster"] = 0
    label = interpret_personas(rfm).Persona.iloc[0]
    assert label == "Typical recency, Typical invoice frequency, Typical purchase value"


def test_duplicate_customer_profiles_rejected(rfm):
    rfm["Cluster"] = 0
    rfm.loc[1, "CustomerID"] = rfm.loc[0, "CustomerID"]
    with pytest.raises(AnalysisValidationError) as caught:
        profile_clusters(rfm)
    assert caught.value.issues[0].code == "invalid_customers"


def test_zero_revenue_share_is_not_invented(rfm):
    rfm["Cluster"] = 0
    rfm["Monetary"] = 0
    with pytest.raises(AnalysisValidationError) as caught:
        profile_clusters(rfm)
    assert caught.value.issues[0].code == "invalid_total"
