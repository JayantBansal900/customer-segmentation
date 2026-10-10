"""Release boundary hardening; tiny deterministic XML fixtures, no resource attacks."""
from io import BytesIO
import zipfile
from dataclasses import replace
import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from backend.config import Settings
from backend.main import create_app
from backend.services import analysis_service

FIELDS = {"selected_k": "2", "candidate_k_min": "2", "candidate_k_max": "2"}

def workbook():
    book=Workbook();sheet=book.active
    sheet.append(["CustomerID","InvoiceNo","InvoiceDate","Quantity","UnitPrice"])
    sheet.append(["0001","I1","2024-01-01",1,2]);sheet.append(["A2","I2","2024-01-02",1,90])
    stream=BytesIO();book.save(stream);return stream.getvalue()

def modify_xml(content, member, declaration):
    result=BytesIO()
    with zipfile.ZipFile(BytesIO(content)) as old, zipfile.ZipFile(result,"w",zipfile.ZIP_DEFLATED) as new:
        for info in old.infolist():
            data=old.read(info.filename)
            if info.filename==member:data=declaration+data
            new.writestr(info,data)
    return result.getvalue()

@pytest.mark.parametrize("member",["xl/worksheets/sheet1.xml","xl/workbook.xml","[Content_Types].xml","xl/styles.xml"])
@pytest.mark.parametrize("declaration",[b'<!DOCTYPE worksheet [<!ENTITY demo "SAFE_ENTITY_VALUE">]>',b'<!DOCTYPE worksheet [<!ENTITY demo SYSTEM "file:///not-a-real-file">]>'])
def test_prohibited_xml_is_safe_error_closes_upload_and_releases_capacity(tmp_path,monkeypatch,member,declaration):
    import starlette.formparsers as parsers
    handles=[];original=parsers.SpooledTemporaryFile
    def capture(*args,**kwargs):
        handle=original(*args,**kwargs);handles.append(handle);return handle
    monkeypatch.setattr(parsers,"SpooledTemporaryFile",capture)
    app=create_app(Settings(repository_root=tmp_path))
    with TestClient(app) as client:
        response=client.post("/api/analyze",data=FIELDS,files={"file":("unsafe.xlsx",modify_xml(workbook(),member,declaration))})
        assert response.status_code==400,response.text
        assert response.json()["error"]["code"]=="invalid_workbook"
        assert "SAFE_ENTITY_VALUE" not in response.text and "file:///" not in response.text and "Traceback" not in response.text
        assert handles and all(handle.closed for handle in handles)
        good=client.post("/api/analyze",data=FIELDS,files={"file":("safe.xlsx",workbook())})
        assert good.status_code==200 and good.json()["metadata"]["customer_count"]==2
        assert client.get("/api/health").status_code==200
    assert all(handle.closed for handle in handles)

def test_xlsx_hardening_fail_closed(monkeypatch):
    monkeypatch.setattr(analysis_service,"DEFUSEDXML",False)
    with pytest.raises(RuntimeError,match="active defusedxml"):
        create_app()

def test_duplicate_archive_members_rejected(tmp_path):
    content=workbook();result=BytesIO()
    with zipfile.ZipFile(BytesIO(content)) as old, zipfile.ZipFile(result,"w") as new:
        for info in old.infolist():new.writestr(info,old.read(info.filename))
        with pytest.warns(UserWarning):new.writestr("xl/workbook.xml",old.read("xl/workbook.xml"))
    with TestClient(create_app(Settings(repository_root=tmp_path))) as client:
        response=client.post("/api/analyze",data=FIELDS,files={"file":("duplicate.xlsx",result.getvalue())})
        assert response.status_code==400 and response.json()["error"]["code"]=="invalid_workbook"

@pytest.mark.parametrize("origin",["*","https://*.example.com","http://example.com","https://app.example.com/path","https://app.example.com/","https://user:password@app.example.com","https://app.example.com?","https://app.example.com#"," https://app.example.com","https://app.example.com:wrong","https://-bad.example.com"])
def test_unsafe_cors_origins_fail_startup(origin):
    with pytest.raises(ValueError):Settings(cors_origins=(origin,))

def test_explicit_production_cors_preflight_and_denied_origin(tmp_path):
    settings=Settings(repository_root=tmp_path,cors_origins=("https://app.example.com",))
    with TestClient(create_app(settings)) as client:
        allowed=client.options("/api/analyze",headers={"Origin":"https://app.example.com","Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"Content-Type"})
        assert allowed.status_code==200 and allowed.headers["access-control-allow-origin"]=="https://app.example.com"
        assert "access-control-allow-credentials" not in allowed.headers
        denied=client.options("/api/analyze",headers={"Origin":"https://untrusted.example.com","Access-Control-Request-Method":"POST"})
        assert denied.status_code==400 and "access-control-allow-origin" not in denied.headers
        assert client.get("/api/health").status_code==200

def test_origins_environment_and_same_origin_mode(monkeypatch):
    monkeypatch.setenv("SEGMENTIQ_CORS_ORIGINS","https://app.example.com,http://localhost:5173")
    assert Settings.from_env().cors_origins==("https://app.example.com","http://localhost:5173")
    monkeypatch.setenv("SEGMENTIQ_CORS_ORIGINS","")
    assert Settings.from_env().cors_origins==()
