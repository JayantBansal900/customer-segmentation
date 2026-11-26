"""Conservative relative descriptions, independent of numerical cluster IDs."""

import numpy as np
import pandas as pd

from .preprocessing import raw_features
from .profiling import profile_clusters


def _number(value: float) -> str:
    return f"{value:,.0f}" if float(value).is_integer() else f"{value:,.2f}"


def _describe(values: tuple[float, float, float], typical: tuple[float, float, float]) -> str:
    """Plain-language summary of a cluster's median customer."""
    (recency, frequency, monetary), (typical_r, typical_f, typical_m) = values, typical
    return (f"A typical customer in this group last bought {_number(recency)} days before the dataset ended "
            f"(overall: {_number(typical_r)}), placed {_number(frequency)} orders (overall: {_number(typical_f)}) "
            f"and spent {_number(monetary)} in total (overall: {_number(typical_m)}).")


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
            "Description": _describe(values, thresholds)})
    return pd.DataFrame(records)
