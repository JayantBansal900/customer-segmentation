import { Link } from 'react-router-dom';
import type { AnalysisResponse } from '../../types/analysis';
import { formatDate, formatNumber, formatScore } from '../../utils/format';

export function ResultSummary({ result }: { result: AnalysisResponse }) {
  const { metadata, model_quality } = result;
  return <section className="panel analysis-result" aria-labelledby="summary-title">
    <h2 id="summary-title">Analysis complete</h2>
    <p>{metadata.dataset_name} · {metadata.preprocessing === 'raw_standard' ? 'Original RFM scaling' : 'Log-transformed RFM scaling'}</p>
    <dl className="metrics">
      {[
        ['Customers analyzed', formatNumber(metadata.customer_count)],
        ['Retained transactions', formatNumber(metadata.cleaned_rows)],
        ['Selected K', formatNumber(metadata.selected_k)],
        ['Recommended K', formatNumber(metadata.recommended_k)],
        ['Silhouette score', formatScore(model_quality.selected.silhouette)],
        ['Total purchase value', formatNumber(metadata.total_monetary)],
      ].map(([label, value]) => <div className="metric" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <p className="muted">Recency reference: {formatDate(metadata.reference_timestamp)}. Purchase values have no assumed currency and exclude returns.</p>
    {model_quality.selected.reason && <p>{model_quality.selected.reason}</p>}
    <div className="actions"><Link className="button" to="/segments">View Segments</Link><Link className="button secondary" to="/insights">Explore Insights</Link></div>
  </section>;
}
