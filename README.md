# Segmentra
[![CI](https://github.com/JayantBansal900/customer-segmentation/actions/workflows/ci.yml/badge.svg)](https://github.com/JayantBansal900/customer-segmentation/actions/workflows/ci.yml)

Segmentra turns a sales export into customer groups you can explore. It builds an RFM profile for every customer (Recency, Frequency, Monetary), groups similar customers with KMeans, and shows the result in a React web app.

## Features

- Upload a CSV or Excel file, or try the built-in Online Retail example.
- Choose the number of groups (K); Segmentra also recommends one using the silhouette score.
- Each group gets a plain name like *Top spenders* or *Lapsed one-time buyers*.
- Compare groups, search any customer, and see everyone on a 2D PCA map.
- Download customers and groups as CSV.

## Tech stack

| Part | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend | FastAPI, Pydantic, Uvicorn |
| Analysis | pandas, NumPy, scikit-learn, python-calamine |

## Run it locally

Requirements: **Python 3.12** and **Node.js 24+**. The commands below are for Windows PowerShell.

**1. Install and start the backend** (from the project folder):

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-backend.txt -e ".[test]"
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

**2. Start the frontend** (in a second terminal):

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open **http://127.0.0.1:5173**, go to **Analyze**, and run the example.

## Preparing your data

Upload **one CSV or Excel (.xlsx) file** where **each row is one product line of a sale**. It **must** have these five columns, spelled exactly like this:

| Column | What it holds | Example |
| --- | --- | --- |
| `CustomerID` | Who bought | `17850` |
| `InvoiceNo` | Order/invoice number. Invoices starting with `C` count as cancellations | `536365` |
| `InvoiceDate` | When the sale happened | `2010-12-01 08:26:00` |
| `Quantity` | Units bought on that line | `6` |
| `UnitPrice` | Price of one unit, without a currency symbol | `2.55` |

```csv
CustomerID,InvoiceNo,InvoiceDate,Quantity,UnitPrice
17850,536365,2010-12-01 08:26:00,6,2.55
17850,536365,2010-12-01 08:26:00,8,3.39
13047,536367,2010-12-01 08:34:00,24,1.69
13047,C536379,2010-12-01 09:41:00,-1,27.50
```

- Extra columns are fine; they are ignored.
- Use dates like `YYYY-MM-DD HH:MM:SS`. For dates like `31/12/2024`, enter `%d/%m/%Y` in **Optional date format** on the Analyze page.
- Skipped automatically: rows with no `CustomerID`, cancellations, quantity or price of 0 or less, and duplicate rows.
- Rejected with an error: a missing `InvoiceNo`, an unreadable date, or text in `Quantity`/`UnitPrice`. The error message gives the row number.
- CSV must be UTF-8. Excel files are read from the first sheet, with column names in the first row.
- Maximum file size is 64 MB (about 1.2 million rows).

## How it works

1. **Clean:** drop returns, cancellations, duplicates and rows without a customer.
2. **RFM:** for each customer, compute days since the last purchase, number of orders and total spend.
3. **Scale:** standardize the three values (optionally log-transformed first).
4. **Cluster:** KMeans (`k-means++`, `random_state=42`) groups similar customers, and the silhouette score is used to recommend K.
5. **Explore:** profiles, PCA map, charts and CSV export.

## Performance

Measured on a Windows laptop, through the API, with K = 4:

| Input | Time |
| --- | --- |
| Online Retail example (XLSX, 541,909 rows) | 11 s |
| CSV, 500,000 rows | 4.4 s |
| CSV, 1,000,000 rows | 10 s |

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest
cd frontend
npm test
```

## Project structure

```text
backend/        FastAPI app and upload handling
segmentation/   RFM, cleaning and clustering engine
frontend/       React app
tests/          Python tests
tools/          Optional script to validate the full workbook
```

## Dataset

`Online Retail.xlsx` is the [UCI Online Retail dataset](https://archive.ics.uci.edu/dataset/352/online+retail) by Chen, D. (2015), [doi:10.24432/C5BW33](https://doi.org/10.24432/C5BW33), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## License and author

Code is released under the [MIT License](LICENSE). Built by [Jayant Bansal](https://github.com/JayantBansal900).
