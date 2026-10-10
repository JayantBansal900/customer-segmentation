"""Business-readable customer features with an explicit historical reference."""

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .errors import invalid

FEATURES = ("Recency", "Frequency", "Monetary")


@dataclass(frozen=True)
class RFMResult:
    """Customer-level raw RFM and the timestamp used to calculate recency."""

    customers: pd.DataFrame
    reference_timestamp: pd.Timestamp


def compute_rfm(cleaned: pd.DataFrame) -> RFMResult:
    """Aggregate cleaned purchases; recency truncates whole elapsed days.

    Frequency counts distinct invoices. Monetary sums positive purchase value,
    which excludes returns and is not a measure of true net revenue.
    """
    required = {"CustomerID", "InvoiceNo", "InvoiceDate", "TotalAmount"}
    if not required.issubset(cleaned.columns) or cleaned.empty:
        raise invalid("invalid_cleaned_data", "RFM requires nonempty cleaned transactions with TotalAmount.", stage="rfm")
    if (cleaned.CustomerID.isna().any() or cleaned.InvoiceNo.isna().any()
            or not pd.api.types.is_datetime64_any_dtype(cleaned.InvoiceDate)
            or cleaned.InvoiceDate.isna().any()):
        raise invalid("invalid_cleaned_data", "RFM requires valid identifiers and typed timestamps.", stage="rfm")
    try:
        amounts = cleaned.TotalAmount.to_numpy(dtype=float)
    except (TypeError, ValueError) as exc:
        raise invalid("invalid_amount", "TotalAmount must be numeric.", stage="rfm") from exc
    if not np.isfinite(amounts).all() or (amounts <= 0).any():
        raise invalid("invalid_amount", "TotalAmount must be finite and positive.", stage="rfm")
    reference = cleaned.InvoiceDate.max() + pd.Timedelta(days=1)
    grouped = cleaned.groupby("CustomerID", sort=True)
    customers = grouped.agg(LatestTransaction=("InvoiceDate", "max"), Frequency=("InvoiceNo", "nunique"), Monetary=("TotalAmount", "sum"))
    customers["Recency"] = (reference - customers.LatestTransaction).dt.days
    customers = customers.reset_index()[["CustomerID", *FEATURES]]
    if not np.isfinite(customers[list(FEATURES)].to_numpy(dtype=float)).all():
        raise invalid("rfm_overflow", "Aggregated RFM values exceed finite numeric range.", stage="rfm")
    return RFMResult(customers, reference)
