# Phase 5D final release staging review

The current release uses the original 124 reviewed Phase 5B paths, with Phase 5C content and Phase 5D visual/documentation changes applied, plus these seven explicit additions (131 changed paths in total):

- `frontend/src/components/ui/TechnicalDetails.tsx`
- `frontend/src/test/content-details.test.tsx`
- `frontend/src/styles/typography.css`
- `docs/screenshots/home.jpg`
- `docs/screenshots/analyze.jpg`
- `docs/screenshots/segments.jpg`
- `docs/screenshots/insights.jpg`

The four JPEG screenshots are current browser captures, under 255 KB each, depicting illustrative Home geometry and real aggregate UCI example analysis. Only these documentation images are intended for publication. Other review screenshots, exports, test input files, backups, environments, build output and local phase reports remain excluded. The inherited UCI workbook and original plot are unchanged; retain dataset/font attribution. No source-code license is invented.

Credential-pattern scanning covers the planned tracked tree and inherited textual history. One URL match was reviewed as the literal invalid-origin regression test `https://user:password@app.example.com`; it contains no live credential. No unresolved secret patterns were found. Pattern scanning cannot guarantee discovery of every credential type.

Backend, ML, API contracts and CSV security source remain unchanged from the checkpoint. The Phase 5D user instruction authorizes a normal commit and push to the matching existing `origin/main` after successful checks; no force push or deployment is authorized. The original Phase 5B manifest below is retained as historical review evidence; its earlier no-push restriction has been superseded by that explicit authorization.

---

# Phase 5B reviewed staging manifest

The index was empty before Phase 5B staging. Stage only the explicit paths below; do not use `git add .` or `git add --all`. This is a local review checkpoint, not authorization to push or deploy. All application source, tests, package manifests, API contracts, frontend assets/font notices, safe environment examples, and release docs are included.

The six inherited tracked files are preserved. `Online Retail.xlsx` is unchanged and already tracked in commit `58d6b6c`; its public UCI provenance and CC BY 4.0 permission are verified in DATASET_NOTICE.md. The original tracked PNG is also retained, without new staging. Neither is newly added or published.

Excluded: environments, node_modules, build output, caches, actual `.env` files, temporary uploads/exports, screenshots, local backups/checkpoints, generated verification JSON, and historical phase validation/audit reports. Existing excluded files are preserved locally. The OpenAPI JSON, type declarations, package lockfile and synthetic test fixtures **are required source inputs** and are included.

Review detected no private-key, GitHub token, live Stripe key or AWS access-key patterns in the allowlist. This scoped scan is not a universal guarantee; run the selected repository/hosting scanner before publication.

## Explicit allowlist (124 paths)

- `.gitignore`
- `BACKEND_API.md`
- `DATASET_NOTICE.md`
- `DEPLOYMENT_READINESS.md`
- `EXPORT_SECURITY.md`
- `PHASE5B_RELEASE_REPORT.md`
- `README.md`
- `STAGING_MANIFEST.md`
- `backend/.env.example`
- `backend/__init__.py`
- `backend/config.py`
- `backend/errors.py`
- `backend/main.py`
- `backend/middleware.py`
- `backend/routes/__init__.py`
- `backend/routes/analysis.py`
- `backend/routes/health.py`
- `backend/schemas.py`
- `backend/services/__init__.py`
- `backend/services/analysis_service.py`
- `frontend/.env.example`
- `frontend/.gitignore`
- `frontend/README.md`
- `frontend/index.html`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/public/fonts/Sora-OFL.txt`
- `frontend/public/fonts/font-source.txt`
- `frontend/public/fonts/sora-latin-variable.woff2`
- `frontend/scripts/sync-contract.mjs`
- `frontend/scripts/verify-http.mjs`
- `frontend/src/app/App.tsx`
- `frontend/src/app/AppLayout.tsx`
- `frontend/src/components/analysis/AnalysisForm.tsx`
- `frontend/src/components/analysis/DatasetUpload.tsx`
- `frontend/src/components/analysis/FilePreview.tsx`
- `frontend/src/components/analysis/ResultSummary.tsx`
- `frontend/src/components/branding/BrandMark.tsx`
- `frontend/src/components/charts/BarChart.tsx`
- `frontend/src/components/charts/CandidateComparison.tsx`
- `frontend/src/components/charts/PCAProjection.tsx`
- `frontend/src/components/charts/RFMDistributions.tsx`
- `frontend/src/components/home/CustomerDimensions.test.tsx`
- `frontend/src/components/home/CustomerDimensions.tsx`
- `frontend/src/components/home/FuturisticSections.tsx`
- `frontend/src/components/home/HomeSections.tsx`
- `frontend/src/components/home/IntelligenceScene.test.tsx`
- `frontend/src/components/home/IntelligenceScene.tsx`
- `frontend/src/components/home/cluster-scene.ts`
- `frontend/src/components/home/intelligence-controller.ts`
- `frontend/src/components/home/intelligence-data.ts`
- `frontend/src/components/home/intelligence-renderer.ts`
- `frontend/src/components/home/point-renderer.ts`
- `frontend/src/components/segments/ClusterDetails.tsx`
- `frontend/src/components/segments/CustomerTable.tsx`
- `frontend/src/components/segments/SegmentComparison.tsx`
- `frontend/src/components/ui/EmptyState.tsx`
- `frontend/src/context/AnalysisContext.tsx`
- `frontend/src/context/analysis-state.ts`
- `frontend/src/hooks/useHealth.ts`
- `frontend/src/main.tsx`
- `frontend/src/pages/About.tsx`
- `frontend/src/pages/Analyze.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Insights.tsx`
- `frontend/src/pages/Methodology.tsx`
- `frontend/src/pages/NotFound.tsx`
- `frontend/src/pages/Segments.tsx`
- `frontend/src/services/api-base.ts`
- `frontend/src/services/api.ts`
- `frontend/src/services/contract.ts`
- `frontend/src/styles/analyze.css`
- `frontend/src/styles/futuristic.css`
- `frontend/src/styles/home.css`
- `frontend/src/styles/index.css`
- `frontend/src/styles/product.css`
- `frontend/src/test/analysis.fixture.json`
- `frontend/src/test/api-base.test.ts`
- `frontend/src/test/api.test.ts`
- `frontend/src/test/app.test.tsx`
- `frontend/src/test/charts.test.tsx`
- `frontend/src/test/csv-security.test.ts`
- `frontend/src/test/customer-table.test.tsx`
- `frontend/src/test/health.test.tsx`
- `frontend/src/test/product-pages.test.tsx`
- `frontend/src/test/setup.ts`
- `frontend/src/test/upload.test.tsx`
- `frontend/src/test/utils.test.ts`
- `frontend/src/types/analysis.ts`
- `frontend/src/types/openapi.json`
- `frontend/src/types/schema.d.ts`
- `frontend/src/utils/cluster-colors.ts`
- `frontend/src/utils/config.ts`
- `frontend/src/utils/csv.ts`
- `frontend/src/utils/customers.ts`
- `frontend/src/utils/format.ts`
- `frontend/src/utils/histogram.ts`
- `frontend/tsconfig.json`
- `frontend/vite.config.ts`
- `pyproject.toml`
- `requirements-backend.txt`
- `segmentation/__init__.py`
- `segmentation/cleaning.py`
- `segmentation/clustering.py`
- `segmentation/errors.py`
- `segmentation/ingestion.py`
- `segmentation/personas.py`
- `segmentation/pipeline.py`
- `segmentation/preprocessing.py`
- `segmentation/profiling.py`
- `segmentation/projection.py`
- `segmentation/rfm.py`
- `tests/conftest.py`
- `tests/test_backend_api.py`
- `tests/test_cleaning.py`
- `tests/test_clustering.py`
- `tests/test_ingestion.py`
- `tests/test_pipeline.py`
- `tests/test_preprocessing.py`
- `tests/test_profiling.py`
- `tests/test_projection.py`
- `tests/test_release_security.py`
- `tests/test_rfm.py`
- `tools/validate_workbook.py`
