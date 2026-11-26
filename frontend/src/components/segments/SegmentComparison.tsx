import { useState } from 'react';
import type { Segment } from '../../types/analysis';
import { clusterColor } from '../../utils/cluster-colors';
import { formatNumber, formatPercent } from '../../utils/format';
import { BarChart } from '../charts/BarChart';

type Names = Map<number, string> | undefined;
const nameOf = (names: Names, id: number) => names?.get(id) ?? `Cluster ${id}`;

/** One card per segment: who they are, how many, how much they buy. Clicking selects the segment. */
export function SegmentDistribution({ segments, selected, onSelect, names }: { segments: Segment[]; selected: number; onSelect(id: number): void; names?: Names }) {
  return <section className="segment-overview" aria-labelledby="population-title">
    <h2 id="population-title" className="sr-only">Customer distribution</h2>
    <div className="population-strip" aria-hidden="true">{segments.map(s => <span key={s.cluster_id} style={{ flexGrow: s.customer_percentage, background: clusterColor(s.cluster_id) }} />)}</div>
    <div className="segment-cards">{segments.map(s => <button key={s.cluster_id} type="button" className="segment-card" aria-pressed={selected === s.cluster_id} onClick={() => onSelect(s.cluster_id)} style={{ ['--segment' as string]: clusterColor(s.cluster_id) }}>
      <span className="segment-card-name">{nameOf(names, s.cluster_id)}</span>
      {names && <span className="segment-card-id">Cluster {s.cluster_id}</span>}
      <span className="segment-card-share"><strong>{formatPercent(s.customer_percentage)}</strong> of customers <small>{formatNumber(s.customer_count)}</small></span>
      <span className="segment-card-share"><strong>{formatPercent(s.monetary_contribution_percentage)}</strong> of sales</span>
      <span className="segment-card-rfm">{formatNumber(s.median_rfm.recency)} days · {formatNumber(s.median_rfm.frequency)} orders · {formatNumber(s.median_rfm.monetary)} spent</span>
    </button>)}</div>
  </section>;
}

export function SegmentRFMComparison({ segments, names }: { segments: Segment[]; names?: Names }) {
  const [metric, setMetric] = useState<'recency' | 'frequency' | 'monetary'>('recency');
  const [aggregate, setAggregate] = useState<'mean_rfm' | 'median_rfm'>('median_rfm');
  const titles = { recency: 'Recency (days)', frequency: 'Frequency (distinct invoices)', monetary: 'Monetary (retained purchase value)' };
  return <section className="rfm-comparison panel" aria-labelledby="compare-title"><div className="section-top"><h2 id="compare-title">Compare the groups</h2><div className="comparison-controls"><label className="field">RFM metric<select value={metric} onChange={e => setMetric(e.target.value as typeof metric)}>{Object.entries(titles).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label><label className="field">Profile aggregation<select value={aggregate} onChange={e => setAggregate(e.target.value as typeof aggregate)}><option value="median_rfm">Median</option><option value="mean_rfm">Mean</option></select></label></div></div>
    <BarChart title={`${aggregate === 'median_rfm' ? 'Median' : 'Mean'} ${titles[metric]}`} bars={segments.map(s => ({ label: nameOf(names, s.cluster_id), value: s[aggregate][metric], color: clusterColor(s.cluster_id) }))} />
    {metric === 'recency' && <p className="help">Lower recency means the group bought more recently.</p>}
  </section>;
}
