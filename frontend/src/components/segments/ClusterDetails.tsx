import { TechnicalDetails } from '../ui/TechnicalDetails';
import { clusterColor } from '../../utils/cluster-colors';
import { useState } from 'react';
import type { Segment } from '../../types/analysis';
import { formatNumber, formatPercent } from '../../utils/format';
import { downloadCsv, segmentCsv } from '../../utils/csv';

export function ClusterDetails({ segments, selectedCluster, onSelect }: { segments: Segment[]; selectedCluster?: number; onSelect?(id: number): void }) {
  const [selected, setSelected] = useState(segments[0]?.cluster_id ?? 0);
  const segment = segments.find(s => s.cluster_id === (selectedCluster ?? selected)) ?? segments[0];
  if (!segment) return <p>No segment profiles were returned.</p>;
  return <section className="panel" aria-labelledby="cluster-title">
    <h2 id="cluster-title">Explore a segment</h2>
    <div className="actions"><label className="field">Selected cluster<select value={segment.cluster_id} onChange={event => { setSelected(Number(event.target.value)); onSelect?.(Number(event.target.value)); }}>{segments.map(s => <option key={s.cluster_id} value={s.cluster_id}>Cluster {s.cluster_id} — {s.customer_count} customers</option>)}</select></label><button className="button secondary" onClick={() => downloadCsv('segmentra-segments.csv', segmentCsv(segments))}>Export segments CSV</button></div>
    <h3><span className="cluster-dot" style={{background:clusterColor(segment.cluster_id)}} aria-hidden="true" /> Cluster {segment.cluster_id}: {segment.persona ?? 'Persona unavailable'}</h3>
    <p className="help">Based on historical purchases; not a prediction.</p><TechnicalDetails summary="How this profile is described"><p>{segment.persona_description ?? 'No persona description was provided.'}</p></TechnicalDetails>
    <dl className="metrics"><div className="metric"><dt>Customers</dt><dd>{formatNumber(segment.customer_count)}</dd></div><div className="metric"><dt>Customer share</dt><dd>{formatPercent(segment.customer_percentage)}</dd></div><div className="metric"><dt>Purchase value</dt><dd>{formatNumber(segment.monetary)}</dd></div><div className="metric"><dt>Purchase-value contribution</dt><dd>{formatPercent(segment.monetary_contribution_percentage)}</dd></div></dl>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Raw RFM profile scroll region"><table><caption>Raw RFM profile for cluster {segment.cluster_id}</caption><thead><tr><th scope="col">Statistic</th><th scope="col">Recency (days)</th><th scope="col">Frequency (invoices)</th><th scope="col">Monetary value</th></tr></thead><tbody>{(['mean_rfm', 'median_rfm'] as const).map(key => <tr key={key}><th scope="row">{key === 'mean_rfm' ? 'Mean' : 'Median'}</th><td>{formatNumber(segment[key].recency)}</td><td>{formatNumber(segment[key].frequency)}</td><td>{formatNumber(segment[key].monetary)}</td></tr>)}</tbody></table></div>
    {segment.recommendations?.length ? <><h3>Returned recommendations</h3><ul>{segment.recommendations.map((text, i) => <li key={i}>{text}</li>)}</ul></> : <p className="help">No action recommendations returned. Personas do not predict churn.</p>}
  </section>;
}
