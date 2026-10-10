import { clusterColor } from '../../utils/cluster-colors';
import { useMemo, useState } from 'react';
import type { Customer } from '../../types/analysis';
import { selectCustomers, type SortKey } from '../../utils/customers';
import { customerCsv, downloadCsv } from '../../utils/csv';
import { formatNumber } from '../../utils/format';

const PAGE_SIZE = 25;
const COLUMNS: [SortKey, string][] = [['customer_id', 'Customer ID'], ['recency', 'Recency (days)'], ['frequency', 'Frequency (invoices)'], ['monetary', 'Monetary value'], ['cluster_id', 'Cluster']];

export function CustomerTable({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState('');
  const [cluster, setCluster] = useState('all');
  const [sort, setSort] = useState<SortKey>('customer_id');
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);
  const clusters = useMemo(() => [...new Set(customers.map(c => c.cluster_id))].sort((a, b) => a - b), [customers]);
  const filtered = useMemo(() => selectCustomers(customers, search, cluster, sort, ascending), [customers, search, cluster, sort, ascending]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  function changeSort(key: SortKey) { setAscending(sort === key ? !ascending : true); setSort(key); setPage(0); }
  return <section className="panel customer-explorer" aria-labelledby="customers-title">
    <h2 id="customers-title">Customer explorer</h2>
    <div className="grid gap-4 sm:grid-cols-2"><label className="field">Search Customer ID<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
      <label className="field">Filter customers by cluster<select value={cluster} onChange={event => { setCluster(event.target.value); setPage(0); }}><option value="all">All clusters</option>{clusters.map(id => <option key={id} value={id}>Cluster {id}</option>)}</select></label></div>
    <div className="actions"><button className="button secondary" disabled={!filtered.length} onClick={() => downloadCsv('segmentra-customers.csv', customerCsv(filtered))}>Export filtered customers CSV</button><span role="status">{formatNumber(filtered.length)} matching customers</span></div>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Customer results scroll region"><table><caption>Customer results — 25 rows per page</caption><thead><tr>{COLUMNS.map(([key, title]) => <th key={key} scope="col" aria-sort={sort === key ? ascending ? 'ascending' : 'descending' : 'none'}><button onClick={() => changeSort(key)} aria-label={`Sort by ${title}`}>{title}{sort === key ? ascending ? ' ↑' : ' ↓' : ''}</button></th>)}<th scope="col">Persona</th></tr></thead><tbody>{visible.map(customer => <tr key={customer.customer_id}><th scope="row">{customer.customer_id}</th><td>{formatNumber(customer.recency)}</td><td>{formatNumber(customer.frequency)}</td><td>{formatNumber(customer.monetary)}</td><td><span className="cluster-badge"><span className="cluster-dot" style={{background:clusterColor(customer.cluster_id)}} aria-hidden="true" />{customer.cluster_id}</span></td><td>{customer.persona ?? 'Unavailable'}</td></tr>)}</tbody></table></div>
    {!filtered.length && <p>No customers match these filters.</p>}
    <div className="actions pagination"><button className="button secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous page</button><span>Page {currentPage + 1} of {pages}</span><button className="button secondary" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next page</button></div>
    <p className="help">Exports include all matches. Formula-like text gets [text] in CSV for spreadsheet safety; IDs stay unchanged here. Import IDs as text to keep leading zeros.</p>
  </section>;
}
