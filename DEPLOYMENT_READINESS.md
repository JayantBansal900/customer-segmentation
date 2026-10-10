# Deployment readiness checklist

No provider has been selected and no deployment performed. Use Python 3.12 and Node 24 for the currently validated environment. Install the backend with `python -m pip install -r requirements-backend.txt` from the repository root; install frontend dependencies with `npm ci`, then `npm run build` in `frontend`. The pinned backend snapshot records the tested versions; validate a fresh installation on the chosen OS before release. `pyproject.toml` retains the supported ranges and optional test/backend groups.

## Origins and startup

Copy the example files only to local ignored `.env` files. Vite loads its environment files; the backend does **not** automatically load dotenv files, so export backend values through the shell/host settings. All `VITE_*` values are public. Never store secrets in them.

- Same-origin production: leave `VITE_API_BASE_URL` empty and set `SEGMENTIQ_CORS_ORIGINS` to an empty string. Reverse-proxy `/api/*` to FastAPI.
- Separate HTTPS hosts: build with `VITE_API_BASE_URL=https://api.example.com` and configure `SEGMENTIQ_CORS_ORIGINS=https://app.example.com` using the actual explicit frontend origin. CORS denies other browser origins; it is not authentication or an abuse prevention control.
- `API_PROXY_TARGET=http://127.0.0.1:8000` is a development/preview proxy setting, not a production browser origin. Local default CORS allows only localhost/127.0.0.1 port 5173. HTTP is accepted only on loopback; public origins require HTTPS, with no paths, credentials or wildcards.

From repository root, launch local development using `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1`. For a container/private service interface use `--host 0.0.0.0 --port <host-assigned-port> --workers 1` behind HTTPS ingress. Host/port are explicit Uvicorn arguments; do not assume backend dotenv contains them. Configure `OMP_NUM_THREADS=1`, `OPENBLAS_NUM_THREADS=1`, `MKL_NUM_THREADS=1` **before** launching Python. Health: `curl --fail http://127.0.0.1:8000/api/health`. Server startup fails closed if openpyxl XML protection is inactive; restart after dependency installation.

Serve only `frontend/dist` as static content. Configure history fallback to `index.html` for `/analyze`, `/segments`, `/insights`, `/methodology`, `/about` and other client routes. Exclude `/api/*` and missing static assets from that fallback. Vite preview validates the built app locally but is not a production server.

## Request and resource policy

Backend defaults: 64 MiB file; 65 MiB entire multipart request; one file/eight fields; 16 KiB text fields; XLSX 1,000 archive members/512 MiB declared expanded content; one admitted analysis per process. Duplicate/encrypted archives and prohibited XML entities are rejected. These limits do not bound total Python object memory or computation time. Preserve the browser preliminary limit (`VITE_MAX_UPLOAD_BYTES=67108864`) and align any tighter ingress limit with user feedback.

The browser waits up to `VITE_ANALYSIS_TIMEOUT_MS=300000`; the development proxy adds 30 seconds. This is **not** server computation cancellation. Set the chosen ingress timeout to accommodate measured requests, and test slow uploads/disconnections. Do not add a misleading thread deadline: abandoned CPU work can continue. Configure bounded upload read time, connection/request rates, request body limits, private temporary storage and disk quotas at the selected ingress/host. Public unauthenticated compute needs abuse controls before exposure.

Historical Phase 5A example: approximately 88.28 s, 482 MiB sampled resident memory and 1.71 MB response. Treat these as measurements of one run, not bounds. A 512 MiB host has inadequate headroom. Start capacity evaluation with at least 1 GiB and preferably 2 GiB per worker, then load-test the selected host and maximum permitted inputs. One worker preserves global per-process admission; multiple workers multiply memory and analysis capacity. Keep `SEGMENTIQ_MAX_CONCURRENT_ANALYSES=1` until measured otherwise. Health is asynchronous while analysis runs in a thread; excess analysis requests return 503 `analysis_busy` and Retry-After 1.

## Required gates before push/hosting

1. Review the staged source manifest, run secret scanning and choose a source-code license. Preserve inherited originals; include dataset/font notices. No private uploads/exports/env values.
2. Reproduce installation, tests and build on the target OS; review current runtime advisories and installer advisories separately.
3. Select a host with demonstrated memory/CPU/temporary-disk headroom; configure HTTPS, exact origins, SPA/API routing and ingestion/abuse limits.
4. Stage-test example, upload limits, invalid XML, busy responses, health responsiveness, disconnect behavior and deep-link refresh through the actual ingress.
5. Decide whether to provision the public UCI example and retain attribution. Never serve raw uploads/workbooks as static assets.
6. Obtain the user's authorization for GitHub push and deployment. Phase 5B grants neither.
