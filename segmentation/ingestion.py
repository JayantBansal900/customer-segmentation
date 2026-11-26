"""CSV/XLSX reading and strict transaction normalization; never writes input."""

from datetime import date, datetime
import csv
from io import StringIO
from numbers import Integral, Real
from pathlib import Path
from typing import IO
from zipfile import BadZipFile, ZipFile

import numpy as np
import pandas as pd
from python_calamine import CalamineError

from .errors import AnalysisValidationError, UnsafeWorkbookError, ValidationIssue, invalid

REQUIRED_COLUMNS = ("CustomerID", "InvoiceNo", "InvoiceDate", "Quantity", "UnitPrice")
Source = str | Path | IO[str] | IO[bytes]

# Workbook XML never needs a DTD. Rejecting declarations before parsing rules
# out entity expansion and external references whatever the XML parser does.
_XML_PARTS = (".xml", ".rels", ".vml")
_PROHIBITED = tuple(
    marker.encode(encoding)
    for marker in ("<!DOCTYPE", "<!ENTITY")
    for encoding in ("utf-8", "utf-16-le", "utf-16-be")
)
_CHUNK = 1024 * 1024
_OVERLAP = max(len(marker) for marker in _PROHIBITED)


def reject_xml_declarations(source: str | Path | IO[bytes]) -> None:
    """Raise UnsafeWorkbookError if any XML part of the archive declares a DTD."""
    position = None if isinstance(source, (str, Path)) else source.tell()
    try:
        with ZipFile(source) as archive:
            for member in archive.infolist():
                if not member.filename.lower().endswith(_XML_PARTS):
                    continue
                with archive.open(member) as part:
                    tail = b""
                    while chunk := part.read(_CHUNK):
                        window = tail + chunk
                        if any(marker in window for marker in _PROHIBITED):
                            raise UnsafeWorkbookError()
                        tail = window[-_OVERLAP:]
    finally:
        if position is not None:
            source.seek(position)


def _check_csv_rows(handle: IO[str]) -> None:
    reader = csv.reader(handle, strict=True)
    header = next(reader, [])
    if len(header) != len(set(header)):
        raise invalid("duplicate_columns", "Duplicate CSV column names are not allowed.", stage="ingestion")
    for row in reader:
        if row and len(row) != len(header):
            raise AnalysisValidationError([ValidationIssue("invalid_csv_row", "CSV records must have the same field count as the header.", rows=(reader.line_num,))], stage="ingestion")


def _identifier(value: object) -> object:
    if pd.isna(value):
        return pd.NA
    if isinstance(value, str):
        return value.strip() or pd.NA
    if isinstance(value, (bool, np.bool_)):
        raise ValueError("Boolean identifiers are not supported")
    if isinstance(value, Integral):
        return str(value)
    if isinstance(value, Real):
        if not np.isfinite(value):
            raise ValueError("Identifiers must be finite")
        return str(int(value)) if float(value).is_integer() else str(value)
    raise ValueError("Identifiers must be text or numeric scalars")


def normalize_transactions(frame: pd.DataFrame, *, date_format: str | None = None) -> pd.DataFrame:
    """Validate and copy input, preserving text IDs and extra source columns.

    Missing customer IDs are allowed for the cleaning policy. Missing invoice
    IDs, invalid dates, and nonfinite/nonnumeric transaction values are errors.
    ISO dates and typed datetimes are accepted by default. Other string date
    formats require an explicit format, avoiding day/month guessing. Timestamps
    are normalized to UTC and returned without timezone metadata; naive source
    timestamps are treated as UTC. Finite fractional quantities are supported.
    Error rows use a header plus one-based row numbering (first data row = 2).
    """
    if not isinstance(frame, pd.DataFrame):
        raise invalid("invalid_input", "Expected a pandas DataFrame.", stage="ingestion")
    if frame.columns.duplicated().any():
        raise invalid("duplicate_columns", "Duplicate column names are not allowed.", stage="ingestion")
    missing = [name for name in REQUIRED_COLUMNS if name not in frame.columns]
    if missing:
        raise AnalysisValidationError([
            ValidationIssue("missing_column", f"Required column is missing: {name}", name)
            for name in missing
        ], stage="ingestion")
    if frame.empty:
        raise invalid("empty_input", "The dataset has no transaction rows.", stage="ingestion")
    result = frame.copy(deep=True).reset_index(drop=True)
    issues: list[ValidationIssue] = []
    for name in ("CustomerID", "InvoiceNo"):
        column = result[name]
        if isinstance(column.dtype, pd.StringDtype) or pd.api.types.is_string_dtype(column.dtype) and column.dtype != object:
            # Typed text column (CSV): same result as _identifier, without a Python loop.
            stripped = column.astype("string").str.strip()
            result[name] = stripped.mask(stripped == "", pd.NA)
            continue
        normalized: list[object] = []
        bad: list[int] = []
        for position, value in enumerate(result[name]):
            try:
                normalized.append(_identifier(value))
            except (ValueError, TypeError):
                bad.append(position + 2)
                normalized.append(pd.NA)
        result[name] = pd.Series(normalized, dtype="string")
        if bad:
            issues.append(ValidationIssue("invalid_identifier", f"{name} has unsupported identifiers.", name, tuple(bad[:10])))
    missing_invoice = result.InvoiceNo.isna()
    if missing_invoice.any():
        issues.append(ValidationIssue("missing_invoice", "InvoiceNo cannot be missing.", "InvoiceNo", tuple(int(i) + 2 for i in np.flatnonzero(missing_invoice)[:10])))

    for name in ("Quantity", "UnitPrice"):
        original = result[name]
        numeric = pd.to_numeric(original, errors="coerce")
        if pd.api.types.is_bool_dtype(original.dtype):
            boolean = pd.Series(True, index=original.index)
        elif original.dtype == object:
            boolean = original.map(lambda v: isinstance(v, (bool, np.bool_)))
        else:
            boolean = pd.Series(False, index=original.index)
        bad = ~np.isfinite(numeric.astype(float)) | boolean
        if bad.any():
            issues.append(ValidationIssue("invalid_numeric", f"{name} must contain finite numeric values.", name, tuple(int(i) + 2 for i in np.flatnonzero(bad)[:10])))
        result[name] = numeric

    dates = result.InvoiceDate
    if pd.api.types.is_datetime64_any_dtype(dates):
        parsed = pd.to_datetime(dates, errors="coerce", utc=True)
    else:
        if dates.dtype == object:
            typed = dates.map(lambda v: isinstance(v, (datetime, date, pd.Timestamp)))
            allowed = typed | dates.map(lambda v: isinstance(v, str))
        else:
            # Typed text column (CSV): every non-missing value is a string.
            typed = pd.Series(False, index=dates.index)
            allowed = dates.notna() & pd.api.types.is_string_dtype(dates.dtype)
        if date_format is None:
            iso = dates.astype("string").str.match(r"^\d{4}-\d{2}-\d{2}(?:$|[T ])", na=False)
            allowed = allowed & (iso | typed)
        parsed = pd.to_datetime(dates.where(allowed), format=date_format or "ISO8601", errors="coerce", utc=True)
    bad_dates = parsed.isna()
    if bad_dates.any():
        issues.append(ValidationIssue("invalid_date", "InvoiceDate contains missing, invalid, or ambiguous dates; supply date_format for non-ISO strings.", "InvoiceDate", tuple(int(i) + 2 for i in np.flatnonzero(bad_dates)[:10])))
    result["InvoiceDate"] = parsed.dt.tz_localize(None)
    if issues:
        raise AnalysisValidationError(issues, stage="ingestion")
    return result


def load_transactions(source: Source, *, file_format: str | None = None, date_format: str | None = None, sheet_name: str | int = 0) -> pd.DataFrame:
    """Read CSV/XLSX from a path or stream and return validated transactions.

    XLSX defaults to its first sheet. Text IDs retain leading zeros. Numeric
    Excel cell formatting cannot recover zeros absent from the stored value.
    A stream without a filename requires file_format. No synthetic fallback.
    """
    name = str(source) if isinstance(source, (str, Path)) else str(getattr(source, "name", ""))
    kind = (file_format or Path(name).suffix.lstrip(".")).lower()
    if kind not in {"csv", "xlsx"}:
        raise invalid("unsupported_format", "Only CSV and XLSX inputs are supported.", stage="ingestion")
    try:
        if kind == "csv":
            # Detect duplicate headers and ragged records before pandas inference.
            if not isinstance(source, (str, Path)):
                if not source.seekable():
                    raise invalid("unseekable_stream", "Input streams must be seekable.", stage="ingestion")
                position = source.tell()
            else:
                position = None
            if position is None:
                with open(source, encoding="utf-8-sig", newline="") as handle:
                    _check_csv_rows(handle)
            else:
                try:
                    text = source.read()
                    if isinstance(text, bytes):
                        text = text.decode("utf-8-sig")
                    _check_csv_rows(StringIO(text))
                finally:
                    source.seek(position)
            frame = pd.read_csv(source, dtype={"CustomerID": "string", "InvoiceNo": "string"}, keep_default_na=False, encoding="utf-8-sig")
        else:
            reject_xml_declarations(source)
            # Header rows are data here, allowing duplicate-header validation.
            # calamine (Rust) reads large workbooks about 10x faster than openpyxl.
            raw = pd.read_excel(source, sheet_name=sheet_name, header=None, dtype=object, keep_default_na=False, engine="calamine")
            if raw.empty:
                raise invalid("empty_input", "The workbook sheet is empty.", stage="ingestion")
            frame = raw.iloc[1:].copy()
            frame.columns = raw.iloc[0].tolist()
    except AnalysisValidationError:
        raise
    except pd.errors.EmptyDataError as exc:
        raise invalid("empty_input", "The file is empty.", stage="ingestion") from exc
    except (OSError, ValueError, TypeError, UnicodeError, ImportError, BadZipFile, CalamineError, pd.errors.ParserError, csv.Error) as exc:
        raise invalid("read_error", f"Cannot read {kind.upper()} input: {exc}", stage="ingestion") from exc
    return normalize_transactions(frame, date_format=date_format)
