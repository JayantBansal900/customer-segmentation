"""Conservative relative descriptions, independent of numerical cluster IDs."""

import numpy as np
import pandas as pd

from .preprocessing import raw_features
from .profiling import profile_clusters


def interpret_personas(customers: pd.DataFrame) -> pd.DataFrame:
    """Describe cluster medians relative to overall customer medians.

    Labels are descriptive within this run, not predictions, guarantees, or
    stable identifiers. Equal medians are explicitly called typical. Multiple
    clusters may legitimately have the same description.
    """
    raw_features(customers)
    summary = profile_clusters(customers)
    typical = customers[["Recency", "Frequency", "Monetary"]].median()
    records = []
    for row in summary.itertuples():
        values = (row.MedianRecency, row.MedianFrequency, row.MedianMonetary)
        thresholds = tuple(float(typical[c]) for c in ("Recency", "Frequency", "Monetary"))
        terms = []
        for value, threshold, lower, equal, higher in zip(values, thresholds,
                ("More recent", "Lower invoice frequency", "Lower purchase value"),
                ("Typical recency", "Typical invoice frequency", "Typical purchase value"),
                ("Less recent", "Higher invoice frequency", "Higher purchase value")):
            terms.append(equal if np.isclose(value, threshold) else lower if value < threshold else higher)
        records.append({"Cluster": row.Cluster, "Persona": ", ".join(terms),
            "Description": f"Cluster median R/F/M = {values}; overall customer medians = {thresholds}. Describes retained purchases only; no churn or revenue prediction."})
    return pd.DataFrame(records)
