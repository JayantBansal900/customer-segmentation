from dataclasses import asdict

import pandas as pd
import pytest

from segmentation.cleaning import clean_transactions
from segmentation.errors import AnalysisValidationError


def test_sequential_exclusions_and_amounts():
    base = {"CustomerID": "A", "InvoiceNo": "I1", "InvoiceDate": "2020-01-01", "Quantity": 2, "UnitPrice": 3}
    rows = [base, {**base, "CustomerID": None, "InvoiceNo": "C1", "Quantity": -1, "UnitPrice": 0},
        {**base, "CustomerID": "B", "InvoiceNo": "C1", "Quantity": -1, "UnitPrice": 0},
        {**base, "CustomerID": "C", "InvoiceNo": "I2", "Quantity": -1, "UnitPrice": 0},
        {**base, "CustomerID": "D", "InvoiceNo": "I3", "Quantity": 0},
        {**base, "CustomerID": "E", "InvoiceNo": "I4", "Quantity": 1, "UnitPrice": 0},
        base.copy(), {**base, "InvoiceNo": "I5", "Quantity": 1, "UnitPrice": 4}]
    source = pd.DataFrame(rows)
    before = source.copy(deep=True)
    cleaned, report = clean_transactions(source)
    assert asdict(report) == {"input_rows": 8, "missing_customer_ids": 1, "cancellation_lines": 1,
        "nonpositive_quantities": 2, "nonpositive_prices": 1, "exact_duplicates": 1,
        "cleaned_rows": 2, "retained_customers": 1}
    assert report.excluded_rows == 6
    assert cleaned.TotalAmount.tolist() == [6., 4.]
    assert cleaned.CustomerID.tolist() == ["A", "A"]
    pd.testing.assert_frame_equal(source, before)


def test_full_source_rows_define_duplicates(transactions):
    source = pd.concat([transactions.iloc[:1], transactions.iloc[:1]], ignore_index=True)
    source["Description"] = ["first", "second"]
    cleaned, report = clean_transactions(source)
    assert report.exact_duplicates == 0
    assert len(cleaned) == 2


@pytest.mark.parametrize("column,value", [("CustomerID", " "), ("InvoiceNo", "C1"), ("Quantity", -1), ("UnitPrice", 0)])
def test_all_excluded_is_structured(column, value, transactions):
    source = transactions.iloc[:1].copy()
    source.loc[:, column] = value
    with pytest.raises(AnalysisValidationError) as caught:
        clean_transactions(source)
    assert caught.value.stage == "cleaning"
    assert caught.value.issues[0].code == "no_eligible_transactions"
    assert caught.value.context["cleaning_report"]["cleaned_rows"] == 0
    assert caught.value.context["cleaning_report"]["input_rows"] == 1


def test_amount_overflow_is_error(transactions):
    source = transactions.iloc[:1].copy()
    source["Quantity"] = 1e308
    source["UnitPrice"] = 1e308
    with pytest.raises(AnalysisValidationError) as caught:
        clean_transactions(source)
    assert caught.value.issues[0].code == "amount_overflow"
