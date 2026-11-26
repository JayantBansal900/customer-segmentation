import { useMemo } from 'react';
import type { Customer } from '../../types/analysis';
import { histogram } from '../../utils/histogram';
import { BarChart } from './BarChart';

export function RFMDistributions({ customers }: { customers: Customer[] }) {
  const charts = useMemo(() => [
    { title: 'Raw recency distribution (days)', bars: histogram(customers.map(c => c.recency), 10, .95) },
    { title: 'Raw frequency distribution (invoices)', bars: histogram(customers.map(c => c.frequency), 10, .95) },
    { title: 'Raw monetary distribution (purchase value)', bars: histogram(customers.map(c => c.monetary), 10, .95) },
  ], [customers]);
  return <section className="rfm-distributions" aria-labelledby="rfm-title"><h2 id="rfm-title">Raw RFM distributions</h2><p>How many customers fall into each range. The last bar collects the top 5% of customers.</p><div className="grid gap-4 lg:grid-cols-3">{charts.map(chart => <BarChart key={chart.title} {...chart} />)}</div></section>;
}
