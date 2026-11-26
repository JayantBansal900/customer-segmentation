import type { Customer, Segment } from '../types/analysis';

/**
 * Short, human names for segments, derived only from the returned medians.
 * Groups are compared with each other (not only with the overall median), so
 * several "above average" groups still get distinct names. Names describe past
 * behavior; they are labels, not predictions.
 */
function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const ACTIVE_NAMES: Record<number, string[]> = {
  1: ['Active customers'],
  2: ['Top spenders', 'Core customers'],
  3: ['Top spenders', 'High-value regulars', 'Core customers'],
  4: ['Top spenders', 'High-value regulars', 'Regular customers', 'Core customers'],
};

export function segmentNames(segments: Segment[], customers: Customer[]): Map<number, string> {
  const overallRecency = median(customers.map(c => c.recency));
  const names = new Map<number, string>();
  // "Lapsed" means the group's typical customer has been away much longer than the typical customer overall.
  const lapsed = segments.filter(s => segments.length > 1 && s.median_rfm.recency > Math.max(overallRecency * 2, overallRecency + 60));
  const active = segments.filter(s => !lapsed.includes(s)).sort((a, b) => b.median_rfm.monetary - a.median_rfm.monetary);
  const pool = ACTIVE_NAMES[active.length];
  active.forEach((segment, i) => {
    const last = i === active.length - 1;
    let name = pool?.[i] ?? (i === 0 ? 'Top spenders' : last ? 'Core customers' : 'Regular customers');
    if (last && active.length > 1 && segment.median_rfm.frequency <= 1) name = 'Light buyers';
    names.set(segment.cluster_id, name);
  });
  [...lapsed].sort((a, b) => b.median_rfm.monetary - a.median_rfm.monetary).forEach((segment, i) => {
    const name = i === 0 && lapsed.length > 1 ? 'Fading high spenders' : segment.median_rfm.frequency <= 1 ? 'Lapsed one-time buyers' : 'Lapsed buyers';
    names.set(segment.cluster_id, name);
  });
  // Keep names unique when the rules above produce the same label twice.
  const seen = new Map<string, number>();
  for (const segment of segments) {
    const name = names.get(segment.cluster_id)!;
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    if (count > 1) names.set(segment.cluster_id, `${name} ${count}`);
  }
  return names;
}
