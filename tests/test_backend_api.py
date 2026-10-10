"""Fast HTTP boundary tests; all actual engine calls use small datasets."""

from concurrent.futures import ThreadPoolExecutor
import asyncio
from dataclasses import replace
from io import BytesIO
import json
from pathlib import Path
from threading import Event, current_thread
import zipfile

from fastapi.testclient import TestClient
import numpy as np
from openpyxl import Workbook
import pandas as pd
import pytest

from backend.config import Settings
from backend.main import create_app
from backend.services import analysis_service


@pytest.fixture
def api_transactions():
    # Same small business population as Phase 1; API fixture is independently scoped.
    rows = []
    for customer, day, price in [("0001", 1, 2), ("A2", 2, 3), ("3", 3, 4), ("B4", 18, 80), ("05", 19, 90), ("C6", 20, 100)]:
        for quantity in (1, 2):
            rows.append({"CustomerID": customer, "InvoiceNo": f"I-{customer}-{quantity}",
                "InvoiceDate": f"2020-01-{day:02d}T12:00:00", "Quantity": quantity, "UnitPrice": price})
    return pd.DataFrame(rows)


@pytest.fixture
def csv_bytes(api_transactions):
    return api_transactions.to_csv(index=False).encode("utf-8")


def workbook_bytes(frame):
    book = Workbook()
    sheet = book.active
    sheet.append(frame.columns.tolist())
    for row in frame.itertuples(index=False, name=None):
        sheet.append(row)
    result = BytesIO()
    book.save(result)
    return result.getvalue()


@pytest.fixture
def app(tmp_path, api_transactions):
    (tmp_path / "Online Retail.xlsx").write_bytes(workbook_bytes(api_transactions))
    return create_app(Settings(repository_root=tmp_path))


@pytest.fixture
def client(app):
    with TestClient(app) as instance:
        yield instance


def request_fields(**changes):
    return {"selected_k": "2", "candidate_k_min": "2", "candidate_k_max": "3", **{key: str(value) for key, value in changes.items()}}


def post_upload(client, content, *, filename="customers.csv", fields=None, mime="text/csv"):
    return client.post("/api/analyze", data=fields or request_fields(), files={"file": (filename, content, mime)})


def post_fields(client, **changes):
    # Text-only multipart, rather than URL-encoded data, for example selection.
    return client.post("/api/analyze", files={key: (None, value) for key, value in request_fields(**changes).items()})


def assert_error(response, status, code=None):
    assert response.status_code == status, response.text
    error = response.json()["error"]
    assert set(error) == {"code", "message", "stage", "issues", "context", "request_id"}
    assert error["request_id"] == response.headers["x-request-id"]
    assert len(error["request_id"]) == 32
    assert "Traceback" not in response.text
    if code:
        assert error["code"] == code
    return error


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "segmentiq", "api_version": "1"}


def test_csv_success_contract(client, csv_bytes):
    response = post_upload(client, csv_bytes)
    assert response.status_code == 200, response.text
    result = response.json()
    assert set(result) == {"metadata", "cleaning", "model_quality", "customers", "segments"}
    metadata = result["metadata"]
    assert metadata["dataset_source"] == "upload"
    assert metadata["dataset_name"] == "customers.csv"
    assert metadata["input_rows"] == metadata["cleaned_rows"] == 12
    assert metadata["customer_count"] == 6
    assert metadata["total_monetary"] == 837
    assert metadata["reference_timestamp"] == "2020-01-21T12:00:00"
    assert metadata["preprocessing"] == "raw_standard"
    assert metadata["engine_preprocessing"] == "baseline"
    assert metadata["request_id"] == response.headers["x-request-id"]
    assert metadata["analysis_elapsed_seconds"] > 0
    expected_customer = {"customer_id", "recency", "frequency", "monetary", "cluster_id", "pc1", "pc2", "persona", "persona_description"}
    assert all(set(row) == expected_customer and isinstance(row["customer_id"], str) for row in result["customers"])
    assert "0001" in {row["customer_id"] for row in result["customers"]}
    expected_segment = {"cluster_id", "customer_count", "customer_percentage", "monetary", "monetary_contribution_percentage", "mean_rfm", "median_rfm", "persona", "persona_description", "recommendations"}
    assert all(set(row) == expected_segment for row in result["segments"])
    assert all(set(row["mean_rfm"]) == {"recency", "frequency", "monetary"} for row in result["segments"])
    assert sum(row["customer_count"] for row in result["segments"]) == 6
    assert sum(row["customer_percentage"] for row in result["segments"]) == pytest.approx(100)
    assert sum(row["monetary_contribution_percentage"] for row in result["segments"]) == pytest.approx(100)
    assert sum(row["monetary"] for row in result["segments"]) == pytest.approx(837)
    assert all(row["recommendations"] is None for row in result["segments"])


def test_xlsx_success(client, api_transactions):
    response = post_upload(client, workbook_bytes(api_transactions), filename="customers.xlsx", mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    assert response.status_code == 200, response.text
    assert response.json()["metadata"]["total_monetary"] == 837
    assert response.json()["customers"][0]["customer_id"] == "0001"


def test_builtin_example_relative_to_repository(client, app, tmp_path, monkeypatch):
    other = tmp_path / "other"
    other.mkdir()
    monkeypatch.chdir(other)
    response = post_fields(client, use_example="true")
    assert response.status_code == 200, response.text
    assert response.json()["metadata"]["dataset_source"] == "example"
    assert response.json()["metadata"]["dataset_name"] == "Online Retail.xlsx"
    assert response.json()["metadata"]["customer_count"] == 6


def test_builtin_missing_is_explicit(client, app):
    app.state.settings.example_dataset.unlink()  # Disposable test workbook only.
    response = post_fields(client, use_example="true")
    assert_error(response, 503, "example_unavailable")
    assert str(app.state.settings.repository_root) not in response.text


def test_missing_file(client):
    assert_error(post_fields(client), 400, "missing_file")


def test_conflicting_sources(client, csv_bytes):
    assert_error(post_upload(client, csv_bytes, fields=request_fields(use_example="true")), 400, "conflicting_sources")


def test_unsupported_format(client, csv_bytes):
    assert_error(post_upload(client, csv_bytes, filename="input.xls"), 400, "unsupported_format")


def test_empty_file(client):
    assert_error(post_upload(client, b""), 400, "empty_file")


def test_header_only_is_invalid_dataset(client, api_transactions):
    response = post_upload(client, api_transactions.iloc[:0].to_csv(index=False).encode())
    error = assert_error(response, 422, "analysis_validation_error")
    assert error["issues"][0]["code"] == "empty_input"


def test_missing_columns(client):
    error = assert_error(post_upload(client, b"CustomerID\nA\n"), 422, "analysis_validation_error")
    assert {row["column"] for row in error["issues"]} == {"InvoiceNo", "InvoiceDate", "Quantity", "UnitPrice"}


@pytest.mark.parametrize("value", ["bad", "01/02/2020", "2020-02-30"])
def test_invalid_date(client, api_transactions, value):
    data = api_transactions.copy()
    data.loc[0, "InvoiceDate"] = value
    error = assert_error(post_upload(client, data.to_csv(index=False).encode()), 422)
    assert any(row["code"] == "invalid_date" and row["rows"] == [2] for row in error["issues"])


def test_explicit_date_format(client, api_transactions):
    data = api_transactions.copy()
    data["InvoiceDate"] = pd.to_datetime(data.InvoiceDate).dt.strftime("%d/%m/%Y")
    response = post_upload(client, data.to_csv(index=False).encode(), fields=request_fields(date_format="%d/%m/%Y"))
    assert response.status_code == 200
    assert response.json()["metadata"]["total_monetary"] == 837


@pytest.mark.parametrize("column,value", [("Quantity", "bad"), ("UnitPrice", "bad"), ("Quantity", "inf")])
def test_nonnumeric_fields(client, api_transactions, column, value):
    data = api_transactions.copy()
    data[column] = data[column].astype(object)
    data.loc[0, column] = value
    error = assert_error(post_upload(client, data.to_csv(index=False).encode()), 422)
    assert any(row["code"] == "invalid_numeric" for row in error["issues"])


@pytest.mark.parametrize("k", ["0", "1", "7", "51", "bad", "2.5"])
def test_invalid_k(client, csv_bytes, k):
    assert_error(post_upload(client, csv_bytes, fields=request_fields(selected_k=k)), 422)


def test_too_few_customers(client, api_transactions):
    data = api_transactions.iloc[:1]
    error = assert_error(post_upload(client, data.to_csv(index=False).encode()), 422)
    assert error["stage"] == "clustering"
    assert error["issues"][0]["code"] == "invalid_k"


@pytest.mark.parametrize("changes", [{"preprocessing": "unknown"}, {"candidate_k_min": "4", "candidate_k_max": "2"}, {"candidate_k_max": "12"}, {"selected_k": ""}, {"dataset_path": "/etc/passwd"}, {"algorithm": "dbscan"}])
def test_unsupported_configuration(client, csv_bytes, changes):
    assert_error(post_upload(client, csv_bytes, fields=request_fields(**changes)), 422, "invalid_configuration")


def test_required_configuration(client, csv_bytes):
    fields = request_fields()
    del fields["selected_k"]
    error = assert_error(post_upload(client, csv_bytes, fields=fields), 422)
    assert any(issue["location"] == ["body", "selected_k"] for issue in error["issues"])


@pytest.mark.parametrize("mode,engine_mode", [("raw_standard", "baseline"), ("log1p_standard", "log1p")])
def test_preprocessing_modes(client, csv_bytes, mode, engine_mode):
    response = post_upload(client, csv_bytes, fields=request_fields(preprocessing=mode))
    assert response.status_code == 200
    assert response.json()["metadata"]["engine_preprocessing"] == engine_mode
    assert sum(row["monetary"] for row in response.json()["customers"]) == 837


def test_selected_and_recommended_k_are_independent(client, csv_bytes):
    response = post_upload(client, csv_bytes, fields=request_fields(selected_k=3, candidate_k_min=2, candidate_k_max=2))
    assert response.status_code == 200
    body = response.json()
    assert body["metadata"]["selected_k"] == 3
    assert body["metadata"]["recommended_k"] == 2
    assert body["model_quality"]["selected"]["k"] == 3
    assert [score["k"] for score in body["model_quality"]["candidates"]] == [2]


def test_small_sample_null_silhouette(client, api_transactions):
    two = api_transactions.iloc[[0, 2]]
    response = post_upload(client, two.to_csv(index=False).encode())
    assert response.status_code == 200
    body = response.json()
    assert body["metadata"]["recommended_k"] is None
    assert body["model_quality"]["selected"]["silhouette"] is None
    assert body["model_quality"]["selected"]["reason"]
    assert "NaN" not in response.text and "Infinity" not in response.text


def test_cleaning_statistics(client, api_transactions):
    base = api_transactions.iloc[0].to_dict()
    extras = [{**base, "CustomerID": "", "InvoiceNo": "C0", "Quantity": 0, "UnitPrice": 0},
        {**base, "CustomerID": "X1", "InvoiceNo": "C1", "Quantity": -1, "UnitPrice": 0},
        {**base, "CustomerID": "X2", "InvoiceNo": "I2", "Quantity": 0, "UnitPrice": 0},
        {**base, "CustomerID": "X3", "InvoiceNo": "I3", "Quantity": 1, "UnitPrice": 0}, base]
    data = pd.concat([api_transactions, pd.DataFrame(extras)], ignore_index=True)
    response = post_upload(client, data.to_csv(index=False).encode())
    assert response.status_code == 200
    assert response.json()["cleaning"] == {"input_rows": 17, "missing_customer_ids": 1, "cancellation_lines": 1,
        "nonpositive_quantities": 1, "nonpositive_prices": 1, "exact_duplicates": 1, "excluded_rows": 5,
        "cleaned_rows": 12, "retained_customers": 6}


def test_all_excluded_returns_cleaning_context(client, api_transactions):
    data = api_transactions.copy()
    data["Quantity"] = 0
    error = assert_error(post_upload(client, data.to_csv(index=False).encode()), 422)
    assert error["context"]["cleaning_report"]["cleaned_rows"] == 0


def test_internal_errors_do_not_expose_or_log_records(client, csv_bytes, monkeypatch, caplog):
    def fail(*args, **kwargs):
        raise RuntimeError("RAW-CUSTOMER-SECRET")
    monkeypatch.setattr(analysis_service, "run_pipeline", fail)
    response = post_upload(client, csv_bytes)
    assert_error(response, 500, "internal_error")
    assert "RAW-CUSTOMER-SECRET" not in response.text
    assert "RAW-CUSTOMER-SECRET" not in caplog.text
    assert "type=RuntimeError" in caplog.text


def test_optional_nonfinite_numbers_become_null(client, csv_bytes, monkeypatch):
    original = analysis_service.run_pipeline
    def unavailable(*args, **kwargs):
        result = original(*args, **kwargs)
        customers = result.customers.copy()
        customers["PC1"] = np.nan
        customers["PC2"] = np.inf
        return replace(result, customers=customers, pca=replace(result.pca, explained_variance_ratio=(np.nan, np.inf), reason="Test unavailable projection"))
    monkeypatch.setattr(analysis_service, "run_pipeline", unavailable)
    response = post_upload(client, csv_bytes)
    assert response.status_code == 200
    body = json.loads(response.content, parse_constant=lambda _: pytest.fail("Invalid JSON number"))
    assert all(row["pc1"] is None and row["pc2"] is None for row in body["customers"])
    assert body["model_quality"]["pca"]["pc1_explained_variance_ratio"] is None


def test_file_limit(tmp_path):
    with TestClient(create_app(Settings(repository_root=tmp_path, max_upload_bytes=64))) as client:
        assert_error(post_upload(client, b"x" * 65), 413, "file_too_large")


def test_declared_body_limit(tmp_path):
    with TestClient(create_app(Settings(repository_root=tmp_path, max_upload_bytes=64, multipart_overhead_bytes=128))) as client:
        response = client.post("/api/analyze", content=b"x", headers={"Content-Type": "multipart/form-data; boundary=x", "Content-Length": "9999"})
        assert_error(response, 413, "request_too_large")


@pytest.mark.parametrize("fake_length", [None, "1"])
def test_streamed_body_limit(tmp_path, fake_length):
    with TestClient(create_app(Settings(repository_root=tmp_path, max_upload_bytes=64, multipart_overhead_bytes=1024))) as client:
        payload = b'--boundary\r\nContent-Disposition: form-data; name="file"; filename="input.csv"\r\n\r\n' + b"x" * 3000 + b"\r\n--boundary--\r\n"
        headers = {"Content-Type": "multipart/form-data; boundary=boundary"}
        if fake_length:
            headers["Content-Length"] = fake_length
        response = client.post("/api/analyze", content=(payload[i:i+128] for i in range(0, len(payload), 128)), headers=headers)
        assert_error(response, 413, "request_too_large")


def test_xlsx_expansion_limit(tmp_path, api_transactions):
    with TestClient(create_app(Settings(repository_root=tmp_path, max_xlsx_expanded_bytes=100))) as client:
        assert_error(post_upload(client, workbook_bytes(api_transactions), filename="input.xlsx"), 413, "workbook_expansion_limit")


def test_partial_multipart_file_closes_on_stream_overflow(tmp_path, monkeypatch):
    # TestClient aggregates streamed bodies; deliver ASGI chunks directly here
    # so a temporary file actually exists before the second chunk exceeds budget.
    import starlette.formparsers as parsers

    app = create_app(Settings(repository_root=tmp_path, max_upload_bytes=64, multipart_overhead_bytes=1024))
    handles = []
    original = parsers.SpooledTemporaryFile

    def capture(*args, **kwargs):
        handle = original(*args, **kwargs)
        handles.append(handle)
        return handle

    monkeypatch.setattr(parsers, "SpooledTemporaryFile", capture)
    chunks = iter([
        b'--boundary\r\nContent-Disposition: form-data; name="file"; filename="input.csv"\r\n\r\n' + b"x" * 256,
        b"x" * 1200 + b"\r\n--boundary--\r\n",
    ])
    messages = []

    async def receive():
        return {"type": "http.request", "body": next(chunks), "more_body": True}

    async def send(message):
        messages.append(message)

    scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
        "method": "POST", "scheme": "http", "path": "/api/analyze", "raw_path": b"/api/analyze",
        "root_path": "", "query_string": b"", "server": ("testserver", 80), "client": ("testclient", 123),
        "headers": [(b"content-type", b"multipart/form-data; boundary=boundary")]}
    asyncio.run(app(scope, receive, send))
    assert messages[0]["status"] == 413
    assert handles and all(handle.closed for handle in handles)
    assert app.state.analysis_service.capacity.acquire(blocking=False)
    app.state.analysis_service.capacity.release()


def test_renamed_binary_csv(client, api_transactions):
    assert_error(post_upload(client, workbook_bytes(api_transactions)), 400, "file_type_mismatch")


def test_renamed_text_xlsx(client, csv_bytes):
    assert_error(post_upload(client, csv_bytes, filename="input.xlsx"), 400, "file_type_mismatch")


def test_corrupt_workbook_xml(client):
    stream = BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        archive.writestr("[Content_Types].xml", "invalid xml")
        archive.writestr("xl/workbook.xml", "invalid xml")
    assert_error(post_upload(client, stream.getvalue(), filename="input.xlsx"), 400)


def test_upload_filename_is_metadata_only(client, csv_bytes):
    response = post_upload(client, csv_bytes, filename="../../private/customers.csv")
    assert response.status_code == 200
    assert response.json()["metadata"]["dataset_name"] == "customers.csv"


def test_mime_claim_is_not_trusted(client, csv_bytes):
    response = post_upload(client, csv_bytes, mime="application/octet-stream")
    assert response.status_code == 200


@pytest.mark.parametrize("content", [b"CustomerID\nA\n", None])
def test_upload_cleanup_after_success_and_validation_error(client, csv_bytes, monkeypatch, content):
    captured = []
    original = client.app.state.analysis_service.analyze
    def observe(parameters, upload, request_id):
        captured.append(upload.file)
        return original(parameters, upload, request_id)
    monkeypatch.setattr(client.app.state.analysis_service, "analyze", observe)
    response = post_upload(client, csv_bytes if content is None else content)
    assert response.status_code == (200 if content is None else 422)
    assert captured and all(handle.closed for handle in captured)


def test_parse_and_pipeline_execute_once_on_worker(client, csv_bytes, monkeypatch):
    calls = []
    real_load, real_run = analysis_service.load_transactions, analysis_service.run_pipeline
    def load(*args, **kwargs):
        calls.append(("load", current_thread().name))
        return real_load(*args, **kwargs)
    def run(*args, **kwargs):
        calls.append(("run", current_thread().name))
        return real_run(*args, **kwargs)
    monkeypatch.setattr(analysis_service, "load_transactions", load)
    monkeypatch.setattr(analysis_service, "run_pipeline", run)
    assert post_upload(client, csv_bytes).status_code == 200
    assert [name for name, _ in calls] == ["load", "run"]
    assert all("AnyIO worker" in thread for _, thread in calls)


def test_bounded_concurrency_preserves_health(client, csv_bytes, monkeypatch):
    entered, release = Event(), Event()
    real_run = analysis_service.run_pipeline
    def slow(*args, **kwargs):
        entered.set()
        assert release.wait(10)
        return real_run(*args, **kwargs)
    monkeypatch.setattr(analysis_service, "run_pipeline", slow)
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(post_upload, client, csv_bytes)
        try:
            assert entered.wait(5)
            assert client.get("/api/health").status_code == 200
            busy = post_upload(client, csv_bytes)
            assert_error(busy, 503, "analysis_busy")
            assert busy.headers["retry-after"] == "1"
        finally:
            release.set()
        assert future.result(timeout=10).status_code == 200


def test_configured_cors(client):
    allowed = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    denied = client.get("/api/health", headers={"Origin": "https://example.com"})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in denied.headers
    assert "access-control-allow-credentials" not in allowed.headers


def test_cors_preflight(client):
    response = client.options("/api/analyze", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_openapi_contract(client):
    schema = client.get("/openapi.json").json()
    endpoint = schema["paths"]["/api/analyze"]["post"]
    request = endpoint["requestBody"]["content"]["multipart/form-data"]["schema"]
    assert request["properties"]["file"]["format"] == "binary"
    assert set(request["required"]) == {"selected_k", "candidate_k_min", "candidate_k_max"}
    assert request["properties"]["preprocessing"]["default"] == "raw_standard"
    assert endpoint["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/AnalysisResponse")


def test_wrong_content_type_and_query(client, csv_bytes):
    assert_error(client.post("/api/analyze", json={"selected_k": 2}), 400, "unsupported_content_type")
    assert_error(client.post("/api/analyze?dataset_path=/tmp/input.csv", data=request_fields(), files={"file": ("input.csv", csv_bytes)}), 400, "unsupported_query")


def test_duplicate_fields(client, csv_bytes):
    parts = [("selected_k", (None, "2")), ("selected_k", (None, "3")), ("candidate_k_min", (None, "2")), ("candidate_k_max", (None, "3")), ("file", ("input.csv", csv_bytes))]
    assert_error(client.post("/api/analyze", files=parts), 400, "duplicate_form_fields")


def test_missing_boundary(client):
    assert_error(client.post("/api/analyze", content=b"bad", headers={"Content-Type": "multipart/form-data"}), 400, "http_error")


def test_unsupported_cors_configuration():
    with pytest.raises(ValueError):
        Settings(cors_origins=("*",))
