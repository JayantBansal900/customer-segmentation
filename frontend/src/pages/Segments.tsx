import { useMemo, useState } from 'react';
import { useAnalysis } from '../context/analysis-state';
import { EmptyState } from '../components/ui/EmptyState';
import { ClusterDetails } from '../components/segments/ClusterDetails';
import { CustomerTable } from '../components/segments/CustomerTable';
import { SegmentDistribution, SegmentRFMComparison } from '../components/segments/SegmentComparison';
import { formatNumber } from '../utils/format';
import { segmentNames } from '../utils/segment-names';
import '../styles/results-pages.css';

export function Segments() {
  const { result } = useAnalysis();
  const [selected, setSelected] = useState(0);
  const names = useMemo(() => result ? segmentNames(result.segments, result.customers) : undefined, [result]);
  const active = result?.segments.find(s => s.cluster_id === selected)?.cluster_id ?? result?.segments[0]?.cluster_id ?? 0;
  return <div className="product-page results-page segments-page">
    <header className="results-heading"><h1>Your customers, decoded.</h1>
      {result ? <p>{formatNumber(result.metadata.customer_count)} customers from {result.metadata.dataset_name}, in {formatNumber(result.metadata.selected_k)} groups. Pick a group to see its profile.</p> : <p>Compare groups, explore profiles, and find individual customers.</p>}
    </header>
    {!result ? <EmptyState /> : <>
      <SegmentDistribution segments={result.segments} selected={active} onSelect={setSelected} names={names} />
      <ClusterDetails segments={result.segments} selectedCluster={active} onSelect={setSelected} names={names} />
      <SegmentRFMComparison segments={result.segments} names={names} />
      <CustomerTable customers={result.customers} names={names} />
    </>}
  </div>;
}
