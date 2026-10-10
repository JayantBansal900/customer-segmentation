# Segmentra frontend

React + TypeScript + Vite. Use the [root README](../README.md#local-setup) for installation, backend/frontend startup and usage. The production entry point is `src/main.tsx`; routes, analysis context, API client and custom visual components are described in [architecture](../docs/technical/ARCHITECTURE.md).

## Frontend configuration

Copy `.env.example` to ignored `.env.local` for local settings. Vite loads environment files; the backend reads process variables separately. `VITE_*` values are public build-time values and must never contain secrets.

| Variable | Default / purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Empty for same-origin `/api`; an explicit HTTP(S) origin supports separate hosting, subject to backend CORS |
| `API_PROXY_TARGET` | `http://127.0.0.1:8000`; server-side development/preview proxy only |
| `VITE_MAX_UPLOAD_BYTES` | `67108864`; preliminary client file limit, aligned with backend |
| `VITE_ANALYSIS_TIMEOUT_MS` | `300000`; browser wait budget; local proxy adds 30 seconds |

No background job or server cancellation is implied by a browser timeout. Results are memory-only and clear on refresh. See [API](../docs/technical/API.md), [security](../docs/technical/SECURITY.md) and [hosting](../docs/technical/DEPLOYMENT.md) for authoritative contracts and constraints.

## Checks and contract maintenance

From this directory: `npm run typecheck`, `npm test`, `npm run build`. These checks do not require starting the application.

`npm run verify:http` requires both local servers and writes ignored `http-validation.json`; it is a live integration verifier, separate from mocked component tests. It was not invoked during cleanup.

After an intentional API contract change, `npm run sync:contract` retrieves `/openapi.json` from the running backend and regenerates TypeScript declarations. Review the resulting diff and tests. `src/types/openapi.json`, `src/types/schema.d.ts` and `src/test/analysis.fixture.json` are required source inputs; preserve them. The fixture is a small test-only API result, not product data.

`npm run preview` is a local built-app server, not a production hosting solution. Completed milestones are in [development history](../docs/development-history/DEVELOPMENT_SUMMARY.md); current setup and public screenshots are in the root README.
