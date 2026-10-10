from io import StringIO

import pandas as pd
import pytest

from segmentation.cleaning import clean_transactions
from segmentation.ingestion import load_transactions
from segmentation.rfm import compute_rfm
from segmentation.errors import AnalysisValidationError


def test_rfm_exact_invoice_count_and_amount():
    stream = StringIO("CustomerID,InvoiceNo,InvoiceDate,Quantity,UnitPrice\nA,I1,2020-01-01,2,10\nA,I1,2020-01-01,3,15\nA,I2,2020-01-03,1,7\n")
    cleaned, _ = clean_transactions(load_transactions(stream, file_format="csv"))
    result = compute_rfm(cleaned)
    assert result.reference_timestamp == pd.Timestamp("2020-01-04")
    assert result.customers.to_dict("records") == [{"CustomerID": "A", "Recency": 1, "Frequency": 2, "Monetary": 72.}]


def test_recency_uses_whole_elapsed_days_and_cleaned_endpoint():
    data = pd.DataFrame({"CustomerID": ["A", "B", "Z"], "InvoiceNo": ["I1", "I2", "C3"],
        "InvoiceDate": ["2020-01-09T15:00:00", "2020-01-10T12:30:00", "2025-01-01"],
        "Quantity": [1, 1, 1], "UnitPrice": [2, 3, 100]})
    cleaned, _ = clean_transactions(data)
    result = compute_rfm(cleaned)
    assert result.reference_timestamp == pd.Timestamp("2020-01-11T12:30:00")
    assert result.customers.Recency.tolist() == [1, 1]
    assert result.customers.Monetary.sum() == 5


def test_rfm_reconciles_and_preserves_customer_strings(transactions):
    cleaned, _ = clean_transactions(transactions)
    result = compute_rfm(cleaned)
    assert result.customers.Monetary.sum() == pytest.approx(cleaned.TotalAmount.sum())
    assert "0001" in result.customers.CustomerID.tolist()
    assert result.customers.Frequency.tolist() == [2] * 6


def test_rfm_invalid_cleaned_input():
    with pytest.raises(AnalysisValidationError) as caught:
        compute_rfm(pd.DataFrame())
    assert caught.value.issues[0].code == "invalid_cleaned_data"
