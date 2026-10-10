import { useMemo } from 'react';
import type { Customer } from '../../types/analysis';
import { histogram } from '../../utils/histogram';
import { BarChart } from './BarChart';

export function RFMDistributions({ customers }: { customers: Customer[] }) {
  const charts = useMemo(() => [
    { title: 'Raw recency distribution (days)', bars: histogram(customers.map(c => c.recency)) },
    { title: 'Raw frequency distribution (invoices)', bars: histogram(customers.map(c => c.frequency)) },
    { title: 'Raw monetary distribution (purchase value)', bars: histogram(customers.map(c => c.monetary)) },
  ], [customers]);
  return <section className="rfm-distributions" aria-labelledby="rfm-title"><h2 id="rfm-title">Raw RFM distributions</h2><p>Customer counts in up to 10 equal-width bins. Outliers can stretch ranges; model inputs stay unchanged.</p><div className="grid gap-4 lg:grid-cols-3">{charts.map(chart => <BarChart key={chart.title} {...chart} />)}</div></section>;
}
