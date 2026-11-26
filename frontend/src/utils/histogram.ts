import { formatNumber } from './format';

/**
 * Presentation-only equal-width frequency bins over returned raw values.
 * With `capQuantile` (e.g. 0.95), bins span up to that quantile and the last
 * bin collects everything above it, so a few extreme customers no longer
 * squeeze everyone else into the first bar.
 */
export function histogram(values: number[], binCount = 10, capQuantile?: number): { label: string; value: number }[] {
  if (!values.length) return [];
  let min = Infinity, max = -Infinity;
  for (const value of values) { min = Math.min(min, value); max = Math.max(max, value); }
  if (min === max) return [{ label: formatNumber(min), value: values.length }];
  let top = max;
  if (capQuantile !== undefined) {
    const sorted = [...values].sort((a, b) => a - b);
    top = sorted[Math.min(sorted.length - 1, Math.floor(capQuantile * (sorted.length - 1)))];
    if (top <= min) top = max;
  }
  const capped = top < max;
  const regular = capped ? binCount - 1 : binCount;
  const width = (top - min) / regular;
  const counts = new Array<number>(binCount).fill(0);
  for (const value of values) counts[value > top ? binCount - 1 : Math.min(regular - 1, Math.floor((value - min) / width))]++;
  return counts.map((value, i) => ({
    label: capped && i === binCount - 1 ? `Over ${formatNumber(top)}` : `${formatNumber(min + i * width)}–${formatNumber(min + (i + 1) * width)}`,
    value,
  }));
}
