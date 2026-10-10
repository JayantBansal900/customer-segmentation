import type { Customer } from '../types/analysis';

export type SortKey = 'customer_id' | 'recency' | 'frequency' | 'monetary' | 'cluster_id';
export function selectCustomers(customers: Customer[], search: string, cluster: string, sort: SortKey, ascending: boolean): Customer[] {
  const query = search.trim().toLocaleLowerCase();
  return customers.filter(c => (!query || c.customer_id.toLocaleLowerCase().includes(query)) && (cluster === 'all' || c.cluster_id === Number(cluster)))
    .sort((a, b) => {
      const order = sort === 'customer_id' ? a.customer_id.localeCompare(b.customer_id) : (a[sort] as number) - (b[sort] as number);
      return (ascending ? 1 : -1) * (order || a.customer_id.localeCompare(b.customer_id));
    });
}
