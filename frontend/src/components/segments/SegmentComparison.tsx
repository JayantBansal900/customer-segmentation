import { useState } from 'react';
import type { Segment } from '../../types/analysis';
import { clusterColor } from '../../utils/cluster-colors';
import { formatNumber, formatPercent } from '../../utils/format';
import { BarChart } from '../charts/BarChart';

export function SegmentDistribution({ segments, selected, onSelect }: { segments: Segment[]; selected: number; onSelect(id: number): void }) {
  return <section className="panel population-panel" aria-labelledby="population-title">
    <div className="section-top"><div><p className="section-kicker">The collective picture</p><h2 id="population-title">Customer distribution</h2></div><span className="quiet-tag">Select a cluster to explore</span></div>
    <div className="population-strip" aria-hidden="true">{segments.map(s => <span key={s.cluster_id} style={{ flexGrow:s.customer_percentage, background:clusterColor(s.cluster_id) }} />)}</div>
    <div className="population-legend">{segments.map(s => <button key={s.cluster_id} type="button" aria-pressed={selected === s.cluster_id} onClick={() => onSelect(s.cluster_id)} title={`Cluster ${s.cluster_id}: ${formatNumber(s.customer_count)} customers, ${formatPercent(s.customer_percentage)} of customers`}>
      <span className="cluster-dot" style={{ background:clusterColor(s.cluster_id) }} /><span>Cluster {s.cluster_id}<small>{formatNumber(s.customer_count)} customers</small></span><strong>{formatPercent(s.customer_percentage)}</strong>
    </button>)}</div>
    <p className="help">Shares cover all analyzed customers. Cluster numbers are labels, not rankings.</p>
  </section>;
}

export function SegmentRFMComparison({ segments }: { segments: Segment[] }) {
  const [metric,setMetric] = useState<'recency'|'frequency'|'monetary'>('recency');
  const [aggregate,setAggregate] = useState<'mean_rfm'|'median_rfm'>('median_rfm');
  const titles = { recency:'Recency (days)', frequency:'Frequency (distinct invoices)', monetary:'Monetary (retained purchase value)' };
  return <section className="rfm-comparison" aria-labelledby="compare-title"><div className="section-top"><div><p className="section-kicker">Compare the behavior</p><h2 id="compare-title">Different groups. Different patterns.</h2></div><div className="comparison-controls"><label className="field">RFM metric<select value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}>{Object.entries(titles).map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label><label className="field">Profile aggregation<select value={aggregate} onChange={e=>setAggregate(e.target.value as typeof aggregate)}><option value="median_rfm">Median</option><option value="mean_rfm">Mean</option></select></label></div></div>
    <BarChart title={`${aggregate === 'median_rfm' ? 'Median' : 'Mean'} ${titles[metric]}`} bars={segments.map(s=>({label:`Cluster ${s.cluster_id}`,value:s[aggregate][metric],color:clusterColor(s.cluster_id)}))} />
    <p className="help">Raw RFM by cluster. Lower recency means a more recent purchase, relative to the dataset. Purchase value excludes returns; currency is not inferred.</p>
  </section>;
}
