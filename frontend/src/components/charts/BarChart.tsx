import { formatNumber } from '../../utils/format';

export interface Bar { label: string; value: number; color?: string }
export function BarChart({ title, bars, percent = false }: { title: string; bars: Bar[]; percent?: boolean }) {
  const maximum = percent ? 100 : bars.reduce((max, bar) => Math.max(max, bar.value), 0);
  return <figure className="panel chart"><figcaption>{title}</figcaption>
    {!bars.length && <p>No values are available for this chart.</p>}
    <ol className="bar-list" aria-label={title}>{bars.map((bar, index) => <li key={`${bar.label}-${index}`} tabIndex={0} title={`${bar.label}: ${formatNumber(bar.value)}${percent ? '%' : ''}`}>
      <div className="bar-label"><span>{bar.label}</span><span>{formatNumber(bar.value)}{percent ? '%' : ''}</span></div>
      <div className="bar-track" aria-hidden="true"><div className="bar-fill" style={{ backgroundColor:bar.color, width: `${maximum ? Math.max(0, Math.min(100, bar.value / maximum * 100)) : 0}%` }} /></div>
    </li>)}</ol>
  </figure>;
}
