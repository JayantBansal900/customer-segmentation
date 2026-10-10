"""Cluster summaries from raw RFM, with explicit population reconciliation."""

import numpy as np
import pandas as pd

from .errors import invalid
from .preprocessing import raw_features


def profile_clusters(customers: pd.DataFrame) -> pd.DataFrame:
    """Summarize counts, retained purchase-value shares, mean and median RFM."""
    raw_features(customers)
    if "Cluster" not in customers or customers.Cluster.isna().any():
        raise invalid("missing_clusters", "Every customer must have a cluster assignment.", stage="profiling")
    if "CustomerID" not in customers or customers.CustomerID.isna().any() or customers.CustomerID.duplicated().any():
        raise invalid("invalid_customers", "Profiles require unique nonmissing customer IDs.", stage="profiling")
    total = float(customers.Monetary.sum())
    if not np.isfinite(total) or total <= 0:
        raise invalid("invalid_total", "Positive finite purchase value is required for revenue percentages.", stage="profiling")
    summary = customers.groupby("Cluster", sort=True).agg(
        CustomerCount=("CustomerID", "size"),
        Revenue=("Monetary", "sum"),
        MeanRecency=("Recency", "mean"), MedianRecency=("Recency", "median"),
        MeanFrequency=("Frequency", "mean"), MedianFrequency=("Frequency", "median"),
        MeanMonetary=("Monetary", "mean"), MedianMonetary=("Monetary", "median"),
    ).reset_index()
    summary["CustomerPercentage"] = summary.CustomerCount / len(customers) * 100
    summary["RevenueContributionPercentage"] = summary.Revenue / total * 100
    if (int(summary.CustomerCount.sum()) != len(customers)
            or not np.isclose(summary.CustomerPercentage.sum(), 100, atol=1e-8)
            or not np.isclose(summary.RevenueContributionPercentage.sum(), 100, atol=1e-8)
            or not np.isclose(summary.Revenue.sum(), total, rtol=1e-10, atol=1e-8)):
        raise invalid("reconciliation_failed", "Cluster counts or purchase-value shares do not reconcile.", stage="profiling")
    return summary
