"""Optional slow integration analysis; never writes or modifies the workbook."""

import argparse
from dataclasses import asdict
import hashlib
import json
from pathlib import Path
from time import perf_counter

import numpy as np
import pandas as pd

from segmentation import PipelineConfig, run_pipeline
from segmentation.ingestion import load_transactions
from segmentation.cleaning import clean_transactions
from segmentation.rfm import compute_rfm


def main() -> None:
    """Compare two explicit representations and reconcile the audit baseline."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--output", type=Path, help="Optional new JSON report; existing files are not overwritten.")
    args = parser.parse_args()
    started = perf_counter()
    original_hash = hashlib.sha256(args.workbook.read_bytes()).hexdigest()
    source = load_transactions(args.workbook)
    loaded_seconds = perf_counter() - started
    cleaned, cleaning = clean_transactions(source)
    rfm = compute_rfm(cleaned)
    baseline_checks = {
        "input_rows": cleaning.input_rows == 541909,
        "cleaned_rows": cleaning.cleaned_rows == 392692,
        "customers": cleaning.retained_customers == 4338,
        "monetary": bool(np.isclose(rfm.customers.Monetary.sum(), 8887208.894, rtol=0, atol=1e-6)),
    }
    runs = {}
    for mode in ("baseline", "log1p"):
        result = run_pipeline(source, PipelineConfig(selected_k=4, preprocessing=mode))
        runs[mode] = {
            "metadata": result.metadata,
            "cleaning_report": asdict(result.cleaning_report),
            "candidates": [asdict(score) for score in result.evaluation.candidates],
            "selected_metrics": asdict(result.selected_metrics),
            "cluster_profiles": result.cluster_profiles.to_dict("records"),
            "personas": result.personas.to_dict("records"),
            "pca_variance": result.pca.explained_variance_ratio,
        }
    final_hash = hashlib.sha256(args.workbook.read_bytes()).hexdigest()
    report = {
        "workbook_name": args.workbook.name, "workbook_sha256": original_hash,
        "workbook_unchanged": original_hash == final_hash, "baseline_checks": baseline_checks,
        "input_loading_seconds": loaded_seconds,
        "raw_rfm_skewness": rfm.customers[["Recency", "Frequency", "Monetary"]].skew().to_dict(),
        "log1p_rfm_skewness": np.log1p(rfm.customers[["Recency", "Frequency", "Monetary"]]).skew().to_dict(),
        "runs": runs, "total_elapsed_seconds": perf_counter() - started,
    }
    rendered = json.dumps(report, indent=2, allow_nan=False)
    if args.output:
        with args.output.open("x", encoding="utf-8") as handle:
            handle.write(rendered + "\n")
    print(rendered)
    if not all(baseline_checks.values()) or not report["workbook_unchanged"]:
        raise SystemExit("Original-workbook baseline checks did not all pass; investigate the report.")


if __name__ == "__main__":
    main()
