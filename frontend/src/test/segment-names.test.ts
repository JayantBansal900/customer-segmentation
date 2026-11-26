import { describe, expect, it } from 'vitest';
import { segmentNames } from '../utils/segment-names';
import type { Customer, Segment } from '../types/analysis';
import fixture from './analysis.fixture.json';

const base = fixture.segments[0] as Segment;
const segment = (cluster_id: number, recency: number, frequency: number, monetary: number): Segment =>
  ({ ...base, cluster_id, median_rfm: { recency, frequency, monetary } });
const customers = (recencies: number[]): Customer[] => recencies.map((recency, i) => ({ ...(fixture.customers[0] as Customer), customer_id: String(i), recency }));

describe('segment names', () => {
  it('names the Online Retail example groups distinctly even when personas match', () => {
    // Medians from the real example run (K = 4); overall median recency is 51 days.
    const segments = [segment(0, 32, 3, 826), segment(1, 243, 1, 310), segment(2, 2, 63, 117210), segment(3, 5, 19, 7990)];
    const names = segmentNames(segments, customers([20, 40, 51, 60, 300]));
    expect([...names.entries()]).toEqual([[2, 'Top spenders'], [3, 'High-value regulars'], [0, 'Core customers'], [1, 'Lapsed one-time buyers']]);
  });
  it('keeps names unique and handles a single group', () => {
    const lapsed = [segment(0, 400, 1, 10), segment(1, 390, 1, 5), segment(2, 3, 4, 100)];
    const names = segmentNames(lapsed, customers([3, 4, 5, 6, 400]));
    expect(new Set(names.values()).size).toBe(3);
    expect(segmentNames([segment(0, 5, 2, 50)], customers([5])).get(0)).toBe('Active customers');
  });
});
