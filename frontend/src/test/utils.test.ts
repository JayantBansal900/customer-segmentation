import { describe, expect, it } from 'vitest';
import type { Customer, Segment } from '../types/analysis';
import { DEFAULT_CONFIG, analysisFormData, validateConfig } from '../utils/config';
import { customerCsv, csvCell, encodeCsv, segmentCsv } from '../utils/csv';
import { selectCustomers } from '../utils/customers';
import { histogram } from '../utils/histogram';
import { formatDate, formatNumber, formatScore } from '../utils/format';
import fixture from './analysis.fixture.json';

describe('analysis parameters', () => {
  it('uses the actual backend defaults and exclusive example form', () => {
    expect(validateConfig(DEFAULT_CONFIG)).toEqual([]);
    const form = analysisFormData(DEFAULT_CONFIG);
    expect(Object.fromEntries(form)).toEqual({ selected_k: '4', candidate_k_min: '2', candidate_k_max: '6', preprocessing: 'raw_standard', use_example: 'true' });
  });
  it.each(['', '1', '51', '2.5', '-2', 'bad'])('rejects invalid selected K: %s', selectedK => {
    expect(validateConfig({ ...DEFAULT_CONFIG, selectedK })).not.toHaveLength(0);
  });
  it('allows chosen K outside candidate bounds', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, selectedK: '10', candidateMin: '2', candidateMax: '3' })).toEqual([]);
  });
  it('rejects inverted and excessive candidate intervals', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, candidateMin: '6', candidateMax: '2' })).not.toEqual([]);
    expect(validateConfig({ ...DEFAULT_CONFIG, candidateMax: '12' })).not.toEqual([]);
  });
  it('checks missing, empty, wrong-extension, and oversized files', () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, source: 'csv' })).toContain('Choose a dataset file.');
    expect(validateConfig({ ...DEFAULT_CONFIG, source: 'csv', file: new File([], 'a.csv') })).toContain('The selected file is empty.');
    expect(validateConfig({ ...DEFAULT_CONFIG, source: 'csv', file: new File(['a'], 'a.xlsx') })).toContain('Choose a .csv file for this source.');
    const file = new File(['a'], 'a.csv'); Object.defineProperty(file, 'size', { value: 70 * 1024 * 1024 });
    expect(validateConfig({ ...DEFAULT_CONFIG, source: 'csv', file })).toContain('The selected file exceeds the preliminary upload-size limit.');
  });
  it('sends upload, selected mode, and optional date format without example flag', () => {
    const file = new File(['data'], 'a.csv');
    const form = analysisFormData({ ...DEFAULT_CONFIG, source: 'csv', file, preprocessing: 'log1p_standard', dateFormat: '%d/%m/%Y' });
    expect(form.get('file')).toMatchObject({ name: 'a.csv', size: 4 });
    expect(form.has('use_example')).toBe(false);
    expect(form.get('date_format')).toBe('%d/%m/%Y');
    expect(form.get('preprocessing')).toBe('log1p_standard');
  });
});

describe('customer display and exports', () => {
  const customers = fixture.customers as Customer[];
  it('filters ID text without coercing leading zeros', () => {
    expect(selectCustomers(customers, '000', 'all', 'customer_id', true).map(c => c.customer_id)).toEqual(['0001']);
  });
  it('filters clusters and sorts numeric values without mutating inputs', () => {
    const before = customers.map(c => c.customer_id);
    const sorted = selectCustomers(customers, '', 'all', 'monetary', false);
    expect(sorted[0].monetary).toBe(100);
    expect(selectCustomers(customers, '', String(customers[0].cluster_id), 'recency', true).every(c => c.cluster_id === customers[0].cluster_id)).toBe(true);
    expect(customers.map(c => c.customer_id)).toEqual(before);
  });
  it('escapes quotes, commas, newlines, and null values', () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(encodeCsv(['id', 'text'], [['0001', 'a,b'], ['A2', null]])).toBe('id,text\r\n0001,"a,b"\r\nA2,\r\n');
  });
  it('exports raw customer values and exact textual IDs', () => {
    expect(customerCsv(customers)).toContain('0001,');
    expect(customerCsv(customers)).toContain('customer_id,recency,frequency,monetary,cluster_id,pc1,pc2');
    expect(customerCsv([]).split('\r\n')).toHaveLength(2);
  });
  it('exports raw mean/median segment fields without fabricated actions', () => {
    const csv = segmentCsv(fixture.segments as Segment[]);
    expect(csv).toContain('mean_recency,mean_frequency,mean_monetary');
    expect(csv).not.toContain('recommendations');
    expect(csv).not.toContain('undefined');
  });
  it('bins returned raw data and preserves customer counts', () => {
    const bins = histogram([1, 2, 3, 4, 100]);
    expect(bins).toHaveLength(10);
    expect(bins.reduce((sum, b) => sum + b.value, 0)).toBe(5);
    expect(histogram([2, 2])).toEqual([{ label: '2', value: 2 }]);
    expect(histogram([])).toEqual([]);
  });
  it('formats null safely and labels dates in UTC without a currency assumption', () => {
    expect(formatNumber(null)).toBe('Unavailable'); expect(formatScore(undefined)).toBe('Unavailable');
    expect(formatNumber(12.5)).toBe('12.5'); expect(formatDate('2011-12-10T12:50:00')).toContain('UTC');
  });
});
