import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AnalysisResponse } from '../../types/analysis';
import { clusterColor } from '../../utils/cluster-colors';
import { formatDate, formatNumber, formatPercent, formatScore } from '../../utils/format';
import { segmentNames } from '../../utils/segment-names';
import { separationLabel } from '../../utils/quality';

export function ResultSummary({ result }: { result: AnalysisResponse }) {
  const { metadata, model_quality } = result;
  const panel = useRef<HTMLElement>(null);
  const names = useMemo(() => segmentNames(result.segments, result.customers), [result]);
  const segments = useMemo(() => [...result.segments].sort((a, b) => b.customer_count - a.customer_count), [result]);
  // Bring the result into view when it first appears, so a finished run is never hidden below the form.
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    panel.current?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [result]);
  const silhouette = model_quality.selected.silhouette;
  return <section ref={panel} className="panel analysis-result" aria-labelledby="summary-title">
    <div className="result-head">
      <div>
        <h2 id="summary-title">Analysis complete</h2>
        <p className="result-headline">{formatNumber(metadata.selected_k)} groups found among {formatNumber(metadata.customer_count)} customers.</p>
      </div>
      <div className="actions"><Link className="button" to="/segments">View Segments</Link><Link className="button secondary" to="/insights">Explore Insights</Link></div>
    </div>
    <ul className="result-groups" aria-label="Groups found">{segments.map(segment => <li key={segment.cluster_id}>
      <span className="cluster-dot" style={{ background: clusterColor(segment.cluster_id) }} aria-hidden="true" />
      <strong>{names.get(segment.cluster_id)}</strong>
      <span>{formatNumber(segment.customer_count)} customers · {formatPercent(segment.monetary_contribution_percentage)} of sales</span>
    </li>)}</ul>
    <dl className="metrics result-facts">
      {([
        ['Customers analyzed', formatNumber(metadata.customer_count)],
        ['Retained transactions', formatNumber(metadata.cleaned_rows)],
        ['Silhouette score', silhouette == null ? 'Unavailable' : <>{formatScore(silhouette)}<small className="metric-note">{separationLabel(silhouette)}</small></>],
        ['Recommended K', formatNumber(metadata.recommended_k)],
      ] as [string, ReactNode][]).map(([label, value]) => <div className="metric" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <p className="muted">{metadata.dataset_name} · Recency is counted back from {formatDate(metadata.reference_timestamp)}.</p>
    {model_quality.selected.reason && <p>{model_quality.selected.reason}</p>}
  </section>;
}
