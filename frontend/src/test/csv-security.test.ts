import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { csvCell, encodeCsv, customerCsv, segmentCsv } from '../utils/csv';
import fixture from './analysis.fixture.json';
import type { Customer, Segment } from '../types/analysis';

const threats = ['=1+1', '+SUM(1,2)', '-1+2', '@SUM(1,2)', '  =1+1', '\t=1+1', '\r\n@SUM(1,2)', '\u0000=1+1', '\u0085+1', '\uFEFF=1+1', '\u200B=1+1', '\u200E@SUM(1,2)', '＝1+1', '＋1', '－1', '＠SUM(1,2)', '\"=1+1', "'=1+1", '=1+1\";,=2+2'];
function parse(csv: string): string[][] {
  const result = Papa.parse<string[]>(csv, { skipEmptyLines: true });
  expect(result.errors).toEqual([]);
  return result.data;
}
describe('spreadsheet export boundary', () => {
  it.each(threats)('protects a parsed cell against formula interpretation: %j', text => {
    const data = parse(encodeCsv(['id', 'next'], [[text, 'ordinary']]));
    expect(data).toHaveLength(2); expect(data[1]).toHaveLength(2);
    expect(data[1][0]).toBe(`[text] ${text}`);
    // Evaluate the decoded field, rather than only its CSV source spelling.
    const interpreted = data[1][0].normalize('NFKC').replace(/^[\p{White_Space}\p{Cc}\p{Cf}'"]+/u, '');
    expect(interpreted[0]).toBe('['); expect(interpreted).not.toMatch(/^[=+\-@]/);
    expect(data[1][1]).toBe('ordinary');
    expect(parse(encodeCsv(['id', 'next'], [data[1]]))[1]).toEqual(data[1]);
  });
  it('preserves actual numeric values, empty cells and ordinary ID text', () => {
    expect(csvCell(-.67)).toBe('-0.67'); expect(csvCell(-12)).toBe('-12');
    expect(parse(encodeCsv(['a', 'b', 'c'], [[-0.67, '0001', null]]))[1]).toEqual(['-0.67', '0001', '']);
    expect(csvCell('-12')).toBe('"[text] -12"');
  });
  it('protects all customer text columns without changing API objects or analytical numbers', () => {
    const c = { ...fixture.customers[0], customer_id: '=1+1', persona: '\t+1', persona_description: '@SUM(1,2)', pc2: -.67 } as Customer;
    const before = structuredClone(c); const rows = parse(customerCsv([c]));
    expect(rows[1][0]).toBe('[text] =1+1'); expect(rows[1][6]).toBe('-0.67');
    expect(rows[1][7]).toBe('[text] \t+1'); expect(rows[1][8]).toBe('[text] @SUM(1,2)'); expect(c).toEqual(before);
  });
  it('applies the same policy to segment text while retaining raw profiles', () => {
    const s = { ...fixture.segments[0], persona: '=1+1', persona_description: '\uFEFF-1' } as Segment;
    const rows = parse(segmentCsv([s]));
    expect(rows[1][11]).toBe('[text] =1+1'); expect(rows[1][12]).toBe('[text] \uFEFF-1');
    expect(Number(rows[1][0])).toBe(s.cluster_id); expect(Number(rows[1][5])).toBe(s.mean_rfm.recency);
  });
});
