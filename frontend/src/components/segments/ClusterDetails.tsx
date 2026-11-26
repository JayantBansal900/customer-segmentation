import { clusterColor } from '../../utils/cluster-colors';
import { useState } from 'react';
import type { Segment } from '../../types/analysis';
import { formatNumber, formatPercent } from '../../utils/format';
import { downloadCsv, segmentCsv } from '../../utils/csv';

export function ClusterDetails({ segments, selectedCluster, onSelect, names }: { segments: Segment[]; selectedCluster?: number; onSelect?(id: number): void; names?: Map<number, string> }) {
  const [selected, setSelected] = useState(segments[0]?.cluster_id ?? 0);
  const segment = segments.find(s => s.cluster_id === (selectedCluster ?? selected)) ?? segments[0];
  if (!segment) return <p>No segment profiles were returned.</p>;
  const name = names?.get(segment.cluster_id);
  return <section className="panel segment-detail" aria-labelledby="cluster-title" style={{ ['--segment' as string]: clusterColor(segment.cluster_id) }}>
    <div className="segment-detail-top">
      <div>
        <h2 id="cluster-title"><span className="cluster-dot" aria-hidden="true" />{name ?? `Cluster ${segment.cluster_id}`}</h2>
        <p className="segment-detail-sub">Cluster {segment.cluster_id} · {segment.persona ?? 'Persona unavailable'}</p>
      </div>
      <div className="actions"><label className="field">Selected cluster<select value={segment.cluster_id} onChange={event => { setSelected(Number(event.target.value)); onSelect?.(Number(event.target.value)); }}>{segments.map(s => <option key={s.cluster_id} value={s.cluster_id}>{names?.get(s.cluster_id) ?? `Cluster ${s.cluster_id}`} — {s.customer_count} customers</option>)}</select></label><button className="button secondary" onClick={() => downloadCsv('segmentra-segments.csv', segmentCsv(segments))}>Export segments CSV</button></div>
    </div>
    {segment.persona_description && <p className="segment-description">{segment.persona_description}</p>}
    <dl className="metrics"><div className="metric"><dt>Customers</dt><dd>{formatNumber(segment.customer_count)}</dd></div><div className="metric"><dt>Customer share</dt><dd>{formatPercent(segment.customer_percentage)}</dd></div><div className="metric"><dt>Purchase value</dt><dd>{formatNumber(segment.monetary)}</dd></div><div className="metric"><dt>Purchase-value contribution</dt><dd>{formatPercent(segment.monetary_contribution_percentage)}</dd></div></dl>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Raw RFM profile scroll region"><table><caption>Raw RFM profile for cluster {segment.cluster_id}</caption><thead><tr><th scope="col">Statistic</th><th scope="col">Recency (days)</th><th scope="col">Frequency (invoices)</th><th scope="col">Monetary value</th></tr></thead><tbody>{(['mean_rfm', 'median_rfm'] as const).map(key => <tr key={key}><th scope="row">{key === 'mean_rfm' ? 'Mean' : 'Median'}</th><td>{formatNumber(segment[key].recency)}</td><td>{formatNumber(segment[key].frequency)}</td><td>{formatNumber(segment[key].monetary)}</td></tr>)}</tbody></table></div>
  </section>;
}
