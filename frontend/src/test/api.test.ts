import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeDataset, getHealth } from '../services/api';
import { matchesContract } from '../services/contract';
import { DEFAULT_CONFIG, ANALYSIS_TIMEOUT_MS } from '../utils/config';
import fixture from './analysis.fixture.json';

const fetchMock = vi.fn();
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.useRealTimers());

describe('typed API client', () => {
  it('checks health against the saved live OpenAPI schema', async () => {
    fetchMock.mockResolvedValue(response({ status: 'ok', service: 'segmentiq', api_version: '1' }));
    await expect(getHealth()).resolves.toBeUndefined();
    expect(matchesContract(fixture, 'AnalysisResponse')).toBe(true);
  });
  it('sends one multipart request without manually setting Content-Type', async () => {
    fetchMock.mockResolvedValue(response(fixture));
    expect(await analyzeDataset(DEFAULT_CONFIG, new AbortController().signal)).toEqual(fixture);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/analyze'); expect(init.body).toBeInstanceOf(FormData); expect(init.headers).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not claim availability for an empty or unsuccessful health response', async () => {
    fetchMock.mockResolvedValueOnce(response({}));
    await expect(getHealth()).rejects.toThrow('Analysis service unavailable');
    fetchMock.mockResolvedValueOnce(response({ status: 'ok', service: 'segmentiq', api_version: '1' }, 503));
    await expect(getHealth()).rejects.toThrow('Analysis service unavailable');
  });
  it.each([400, 413, 422, 500, 503])('preserves structured backend errors (%s)', async status => {
    const detail = { code: 'failure', message: 'Validation failed', stage: 'ingestion', issues: [{ code: 'missing_column', message: 'Missing Quantity', column: 'Quantity', rows: [2], location: [] }], context: {}, request_id: 'test-id' };
    fetchMock.mockResolvedValue(response({ error: detail }, status));
    await expect(analyzeDataset(DEFAULT_CONFIG, new AbortController().signal)).rejects.toMatchObject({ failure: { status, detail, kind: 'http' } });
  });
  it('rejects invalid configuration before network access', async () => {
    await expect(analyzeDataset({ ...DEFAULT_CONFIG, selectedK: '1' }, new AbortController().signal)).rejects.toMatchObject({ failure: { kind: 'validation' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('handles network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(analyzeDataset(DEFAULT_CONFIG, new AbortController().signal)).rejects.toMatchObject({ failure: { kind: 'network' } });
  });
  it.each([new Response('<html>proxy error</html>', { status: 502 }), new Response('{', { headers: { 'Content-Type': 'application/json' } }), response({ unexpected: true })])('rejects unexpected responses', async value => {
    fetchMock.mockResolvedValue(value);
    await expect(analyzeDataset(DEFAULT_CONFIG, new AbortController().signal)).rejects.toMatchObject({ failure: { kind: 'unexpected' } });
  });
  it('rejects wrong numeric and identifier types from successful responses', () => {
    const value = structuredClone(fixture);
    (value.customers[0] as unknown as { customer_id: number }).customer_id = 1;
    expect(matchesContract(value, 'AnalysisResponse')).toBe(false);
    const nonfinite = structuredClone(fixture); nonfinite.metadata.total_monetary = Infinity;
    expect(matchesContract(nonfinite, 'AnalysisResponse')).toBe(false);
  });
  it('allows documented null metrics', () => {
    const value = structuredClone(fixture); value.model_quality.selected.silhouette = null as unknown as number;
    value.customers[0].pc1 = null as unknown as number;
    expect(matchesContract(value, 'AnalysisResponse')).toBe(true);
  });
  it('cancels a pending request and clears the timeout', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
    const controller = new AbortController(); const pending = analyzeDataset(DEFAULT_CONFIG, controller.signal);
    const assertion = expect(pending).rejects.toMatchObject({ failure: { kind: 'cancelled' } });
    controller.abort(); await assertion; expect(vi.getTimerCount()).toBe(0);
  });
  it('uses the real configured timeout instead of simulated progress', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
    const assertion = expect(analyzeDataset(DEFAULT_CONFIG, new AbortController().signal)).rejects.toMatchObject({ failure: { kind: 'timeout' } });
    await vi.advanceTimersByTimeAsync(ANALYSIS_TIMEOUT_MS + 1); await assertion; expect(vi.getTimerCount()).toBe(0);
  });
});
