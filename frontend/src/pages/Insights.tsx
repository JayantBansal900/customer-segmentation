import { TechnicalDetails } from '../components/ui/TechnicalDetails';
import { useAnalysis } from '../context/analysis-state';
import { EmptyState } from '../components/ui/EmptyState';
import { BarChart } from '../components/charts/BarChart';
import { CandidateComparison } from '../components/charts/CandidateComparison';
import { RFMDistributions } from '../components/charts/RFMDistributions';
import { PCAProjection } from '../components/charts/PCAProjection';
import { formatNumber, formatPercent, formatScore } from '../utils/format';
import { customerCsv, downloadCsv } from '../utils/csv';
import { separationLabel } from '../utils/quality';
import '../styles/results-pages.css';

export function Insights() {
  const { result } = useAnalysis();
  const heading = <header className="results-heading"><h1>Intelligence behind the segments.</h1><p>How well the groups are separated, how K was chosen, and what was cleaned out of the data.</p></header>;
  if (!result) return <div className="product-page results-page insights-page">{heading}<EmptyState /></div>;
  const { metadata, model_quality: quality, cleaning } = result;
  const silhouette = quality.selected.silhouette;
  const hasNotes = quality.candidates.some(c => c.reason);
  const removed = [
    ['No customer ID', cleaning.missing_customer_ids],
    ['Cancellations', cleaning.cancellation_lines],
    ['Quantity ≤ 0', cleaning.nonpositive_quantities],
    ['Price ≤ 0', cleaning.nonpositive_prices],
    ['Exact duplicates', cleaning.exact_duplicates],
  ] as const;
  // Colors follow the bar order, which skips steps that removed nothing.
  const shown = removed.filter(([, value]) => value > 0).map(([label]) => label as string);
  const share = (value: number) => cleaning.input_rows ? value / cleaning.input_rows * 100 : 0;
  return <div className="product-page results-page insights-page">{heading}
    <section className="panel insights-model quality-verdict" aria-labelledby="quality-title">
      <div className="verdict-main">
        <h2 id="quality-title">Group quality</h2>
        <p className="verdict-word">{silhouette == null ? 'Not measurable' : separationLabel(silhouette).replace(/^./, c => c.toUpperCase())}</p>
        {silhouette != null && <div className="silhouette-scale" role="img" aria-label={`Silhouette ${formatScore(silhouette)} on a scale from −1 to 1`}>
          <span className="scale-marker" style={{ left: `${(silhouette + 1) / 2 * 100}%` }} />
          <span className="scale-labels" aria-hidden="true"><span>−1 overlapping</span><span>0</span><span>1 separated</span></span>
        </div>}
        <p className="help">Silhouette runs from −1 to 1: higher means the groups are more clearly separated.</p>
        {quality.selected.reason && <p>{quality.selected.reason}</p>}
        <TechnicalDetails summary="How model quality is measured"><p>{quality.recommendation_explanation}</p><p>Scored on up to {formatNumber(quality.silhouette_sampling.maximum_customers)} sampled customers, so very small clusters may be missed. Scores from different scaling options can't be compared directly.</p></TechnicalDetails>
      </div>
      <dl className="metrics">{[['Selected K', formatNumber(metadata.selected_k)], ['Recommended K', formatNumber(metadata.recommended_k)], ['Silhouette score', formatScore(silhouette)], ['Inertia', formatNumber(quality.selected.inertia)]].map(([label, value]) => <div className="metric" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>

    <div className="projection-layout"><PCAProjection customers={result.customers} />
      <section className="panel projection-notes"><h2>What the map keeps</h2><p>The map squeezes three numbers into two, so some detail is lost. Together the two axes keep this much of the variation:</p>
        <dl className="metrics"><div className="metric"><dt>PC1</dt><dd>{quality.pca.pc1_explained_variance_ratio == null ? 'Unavailable' : formatPercent(quality.pca.pc1_explained_variance_ratio * 100)}</dd></div><div className="metric"><dt>PC2</dt><dd>{quality.pca.pc2_explained_variance_ratio == null ? 'Unavailable' : formatPercent(quality.pca.pc2_explained_variance_ratio * 100)}</dd></div></dl>
        {quality.pca.reason && <p>{quality.pca.reason}</p>}
        <button className="button secondary" disabled={!result.customers.length} onClick={() => downloadCsv('segmentra-customers.csv', customerCsv(result.customers))}>Export all customers CSV</button>
      </section>
    </div>

    <section className="panel choosing-k" aria-labelledby="k-title">
      <h2 id="k-title">Candidate K evaluation</h2>
      <p>The recommendation is the K with the highest silhouette. Inertia usually falls as K grows, so it is shown for reference only.</p>
      <div className="analytics-pair"><CandidateComparison quality={quality} selectedK={metadata.selected_k} /><BarChart title="Candidate inertia" bars={quality.candidates.filter(c => c.inertia != null).map(c => ({ label: `K = ${c.k}${c.k === metadata.selected_k ? ' · selected' : ''}`, value: c.inertia!, color: c.k === metadata.selected_k ? '#66dccb' : '#99bcef' }))} /></div>
      <TechnicalDetails summary="See the numbers"><div className="table-scroll" tabIndex={0} role="region" aria-label="Candidate models scroll region"><table><caption>Candidate models</caption><thead><tr><th scope="col">K</th><th scope="col">Inertia</th><th scope="col">Silhouette</th>{hasNotes && <th scope="col">Note</th>}</tr></thead><tbody>{quality.candidates.map(c => <tr key={c.k} className={c.k === metadata.selected_k ? 'candidate-selected' : ''}><th scope="row">{c.k}{c.k === metadata.selected_k && <span className="selected-tag">Selected</span>}</th><td>{formatNumber(c.inertia)}</td><td>{formatScore(c.silhouette)}</td>{hasNotes && <td>{c.reason ?? '—'}</td>}</tr>)}</tbody></table></div></TechnicalDetails>
    </section>

    <section className="panel cleaning-panel" aria-labelledby="cleaning-title">
      <h2 id="cleaning-title">Data-cleaning summary</h2>
      <p>{formatNumber(cleaning.cleaned_rows)} of {formatNumber(cleaning.input_rows)} transaction lines were used ({formatPercent(share(cleaning.cleaned_rows))}), covering {formatNumber(cleaning.retained_customers)} customers.</p>
      <div className="cleaning-bar" role="img" aria-label={`Kept ${formatNumber(cleaning.cleaned_rows)} lines; removed ${removed.map(([label, value]) => `${label} ${formatNumber(value)}`).join(', ')}`}>
        <span className="kept" style={{ flexGrow: Math.max(share(cleaning.cleaned_rows), .5) }} />
        {removed.filter(([, value]) => value > 0).map(([label, value]) => <span key={label} className={`removed removed-${shown.indexOf(label)}`} style={{ flexGrow: Math.max(share(value), .5) }} />)}
      </div>
      <ul className="cleaning-list">
        <li><span className="swatch kept" />Kept<strong>{formatNumber(cleaning.cleaned_rows)}</strong></li>
        {removed.map(([label, value]) => <li key={label} className={value ? '' : 'is-zero'}><span className={`swatch removed removed-${shown.indexOf(label)}`} />{label}<strong>{formatNumber(value)}</strong></li>)}
      </ul>
    </section>

    <RFMDistributions customers={result.customers} />
  </div>;
}
