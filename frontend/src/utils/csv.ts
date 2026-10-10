import type { Customer, Segment } from '../types/analysis';

/** Visible ASCII prefix is deliberately part of risky text in spreadsheet exports.
 * It survives normal trimming/CSV quoting without relying on apostrophe or tab semantics.
 * Numeric API values (including negative PCA coordinates) remain numeric and unchanged.
 */
export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  const untrustedText = typeof value === 'string';
  const probe = text.normalize('NFKC').replace(/^[\p{White_Space}\p{Cc}\p{Cf}'"]+/u, '');
  const protectedText = untrustedText && /^[=+\-@]/.test(probe);
  if (protectedText) text = `[text] ${text}`;
  return protectedText || /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function encodeCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function customerCsv(customers: Customer[]): string {
  return encodeCsv(['customer_id', 'recency', 'frequency', 'monetary', 'cluster_id', 'pc1', 'pc2', 'persona', 'persona_description'],
    customers.map(c => [c.customer_id, c.recency, c.frequency, c.monetary, c.cluster_id, c.pc1, c.pc2, c.persona, c.persona_description]));
}

export function segmentCsv(segments: Segment[]): string {
  return encodeCsv(['cluster_id', 'customer_count', 'customer_percentage', 'monetary', 'monetary_contribution_percentage',
    'mean_recency', 'mean_frequency', 'mean_monetary', 'median_recency', 'median_frequency', 'median_monetary', 'persona', 'persona_description'],
    segments.map(s => [s.cluster_id, s.customer_count, s.customer_percentage, s.monetary, s.monetary_contribution_percentage,
      s.mean_rfm.recency, s.mean_rfm.frequency, s.mean_rfm.monetary, s.median_rfm.recency, s.median_rfm.frequency, s.median_rfm.monetary, s.persona, s.persona_description]));
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
