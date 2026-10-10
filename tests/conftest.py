"""Small deterministic fixtures; no original workbook in the fast suite."""

import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def transactions():
    rows = []
    for customer, day, price in [("0001", 1, 2), ("A2", 2, 3), ("3", 3, 4), ("B4", 18, 80), ("05", 19, 90), ("C6", 20, 100)]:
        for number in (1, 2):
            rows.append({"CustomerID": customer, "InvoiceNo": f"I-{customer}-{number}",
                "InvoiceDate": f"2020-01-{day:02d}T12:00:00", "Quantity": number, "UnitPrice": price})
    return pd.DataFrame(rows)


@pytest.fixture
def rfm():
    return pd.DataFrame({"CustomerID": ["a", "b", "c", "d", "e", "f"],
        "Recency": [100, 101, 102, 1, 2, 3], "Frequency": [1, 2, 1, 20, 21, 22],
        "Monetary": [10., 11., 12., 1000., 1100., 1200.]})


@pytest.fixture
def features():
    return np.array([[0, 0, 0], [.1, .1, .1], [.2, .2, .2], [10, 10, 10], [10.1, 10.1, 10.1], [10.2, 10.2, 10.2]])
