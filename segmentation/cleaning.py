"""Sequential purchase-only exclusions; retained value is not net revenue."""

from dataclasses import asdict, dataclass

import numpy as np
import pandas as pd

from .errors import invalid
from .ingestion import normalize_transactions


@dataclass(frozen=True)
class CleaningReport:
    """Mutually exclusive counts measured in the documented filter order."""

    input_rows: int
    missing_customer_ids: int
    cancellation_lines: int
    nonpositive_quantities: int
    nonpositive_prices: int
    exact_duplicates: int
    cleaned_rows: int
    retained_customers: int

    @property
    def excluded_rows(self) -> int:
        return self.input_rows - self.cleaned_rows


def clean_transactions(frame: pd.DataFrame) -> tuple[pd.DataFrame, CleaningReport]:
    """Copy/validate transactions, remove exclusions, then add TotalAmount.

    Invalid transaction values are rejected rather than imputed. Negative and
    zero numeric values are valid input but excluded by this purchase policy.
    Duplicate comparison uses all source columns, before adding TotalAmount.
    Missing IDs, cancellations, quantity, price, duplicates are counted in order.
    """
    work = normalize_transactions(frame)
    initial = len(work)
    counts: list[int] = []
    for predicate in (
        lambda d: d.CustomerID.isna(),
        lambda d: d.InvoiceNo.str.startswith("C", na=False),
        lambda d: d.Quantity <= 0,
        lambda d: d.UnitPrice <= 0,
        lambda d: d.duplicated(),
    ):
        excluded = predicate(work)
        counts.append(int(excluded.sum()))
        work = work.loc[~excluded].copy()
    report = CleaningReport(initial, *counts, len(work), int(work.CustomerID.nunique()))
    if work.empty:
        raise invalid("no_eligible_transactions", "No purchase transactions remain after cleaning.", stage="cleaning", context={"cleaning_report": asdict(report)})
    with np.errstate(over="ignore", invalid="ignore"):
        work["TotalAmount"] = work.Quantity.astype(float) * work.UnitPrice.astype(float)
    if not np.isfinite(work.TotalAmount).all():
        raise invalid("amount_overflow", "Quantity × UnitPrice exceeds finite numeric range.", stage="cleaning")
    work = work.reset_index(drop=True)
    return work, report
