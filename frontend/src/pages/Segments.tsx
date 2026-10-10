import { useState } from 'react';
import { useAnalysis } from '../context/analysis-state';
import { EmptyState } from '../components/ui/EmptyState';
import { ClusterDetails } from '../components/segments/ClusterDetails';
import { CustomerTable } from '../components/segments/CustomerTable';
import { SegmentDistribution, SegmentRFMComparison } from '../components/segments/SegmentComparison';
import { BarChart } from '../components/charts/BarChart';
import { clusterColor } from '../utils/cluster-colors';
import { formatNumber } from '../utils/format';

export function Segments() {
  const { result } = useAnalysis();
  const [selected,setSelected] = useState(0);
  const active = result?.segments.find(s=>s.cluster_id===selected)?.cluster_id ?? result?.segments[0]?.cluster_id ?? 0;
  return <div className="product-page segments-page"><header className="product-heading"><p className="section-kicker">Customer segmentation explorer</p><h1>Your customers, <em>decoded.</em></h1><p>Compare groups, explore profiles, and find individual customers.</p></header>{!result ? <EmptyState /> : <>
    <div className="overview-ribbon"><div><span>Customers analyzed</span><strong>{formatNumber(result.metadata.customer_count)}</strong></div><div><span>Selected clusters</span><strong>{formatNumber(result.metadata.selected_k)}</strong></div><div className="dataset-context"><span>Current dataset</span><p>{result.metadata.dataset_name}</p><small>Historical purchases · {result.metadata.preprocessing === 'raw_standard' ? 'Original RFM scaling' : 'Log-transformed RFM scaling'}</small></div></div>
    <SegmentDistribution segments={result.segments} selected={active} onSelect={setSelected} />
    <div className="profile-layout"><ClusterDetails segments={result.segments} selectedCluster={active} onSelect={setSelected} /><BarChart title="Purchase-value contribution by segment" percent bars={result.segments.map(s=>({label:`Cluster ${s.cluster_id}`,value:s.monetary_contribution_percentage,color:clusterColor(s.cluster_id)}))} /></div>
    <SegmentRFMComparison segments={result.segments} /><CustomerTable customers={result.customers} />
  </>}</div>;
}
