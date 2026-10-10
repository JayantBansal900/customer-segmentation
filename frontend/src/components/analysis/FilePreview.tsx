import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { formatNumber } from '../../utils/format';

export const REQUIRED_COLUMNS = ['CustomerID', 'InvoiceNo', 'InvoiceDate', 'Quantity', 'UnitPrice'];
interface Preview { columns: string[]; rows: string[][] }

export function FilePreview({ file }: { file: File | null }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setPreview(null); setError('');
    if (!file || !file.name.toLowerCase().endsWith('.csv')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = Papa.parse<string[]>(String(reader.result), { delimiter: ',', skipEmptyLines: 'greedy', preview: 7 });
      const [columns = [], ...rows] = parsed.data;
      setPreview({ columns, rows: rows.slice(0, 5).map(row => row.slice(0, 8)) });
    };
    reader.onerror = () => setError('Could not read the preliminary CSV preview. The backend remains the authoritative validator.');
    reader.readAsText(file.slice(0, 65_536), 'UTF-8');
    return () => { reader.onload = null; reader.onerror = null; if (reader.readyState === FileReader.LOADING) reader.abort(); };
  }, [file]);
  if (!file) return <p className="muted">Choose a file to preview its details.</p>;
  return <section aria-label="Preliminary file inspection">
    <dl className="file-details"><div><dt>Filename</dt><dd>{file.name}</dd></div><div><dt>File type</dt><dd>{file.name.split('.').pop()?.toUpperCase()}</dd></div><div><dt>File size</dt><dd>{formatNumber(file.size / 1024 / 1024)} MiB ({formatNumber(file.size)} bytes)</dd></div></dl>
    <p>Preview only. The server checks all records, types, dates, and usable customers.</p>
    {error && <p role="alert">{error}</p>}
    {preview ? <>
      <h3>Required column checklist</h3>
      <ul className="column-checklist">{REQUIRED_COLUMNS.map(column => <li key={column}>{preview.columns.includes(column) ? 'Present' : 'Missing'}: <code>{column}</code></li>)}</ul>
      <p className="muted">Preview: up to 5 records and 8 columns from the first 64 KiB; not full-file validation.</p>
      <div className="table-scroll"><table><caption>Transaction preview</caption><thead><tr>{preview.columns.slice(0, 8).map((column, i) => <th key={i} scope="col">{column || '(blank header)'}</th>)}</tr></thead><tbody>{preview.rows.map((row, i) => <tr key={i}>{preview.columns.slice(0, 8).map((_, j) => <td key={j}>{row[j] ?? ''}</td>)}</tr>)}</tbody></table></div>
    </> : file.name.toLowerCase().endsWith('.xlsx') ? <p>XLSX records are inspected on the server. Browser preview is CSV only.</p> : <p className="muted">Reading a bounded CSV preview…</p>}
  </section>;
}
