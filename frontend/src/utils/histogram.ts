import { formatNumber } from './format';

/** Presentation-only equal-width frequency bins over returned raw values. */
export function histogram(values: number[], binCount = 10): { label: string; value: number }[] {
  if (!values.length) return [];
  let min = Infinity, max = -Infinity;
  for (const value of values) { min = Math.min(min, value); max = Math.max(max, value); }
  if (min === max) return [{ label: formatNumber(min), value: values.length }];
  const width = (max - min) / binCount;
  const counts = new Array<number>(binCount).fill(0);
  for (const value of values) counts[Math.min(binCount - 1, Math.floor((value - min) / width))]++;
  return counts.map((value, i) => ({ label: `${formatNumber(min + i * width)}–${formatNumber(min + (i + 1) * width)}`, value }));
}
