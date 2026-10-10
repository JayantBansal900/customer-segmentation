import { describe, expect, it, vi } from 'vitest';
import { resolveApiBase, apiUrl } from '../services/api-base';

describe('deployment API origin', () => {
  it('retains relative requests by default', () => {
    expect(resolveApiBase(undefined)).toBe('');
    expect(resolveApiBase('')).toBe('');
    expect(apiUrl('/api/analyze')).toBe('/api/analyze');
  });
  it('normalizes an explicitly configured HTTPS origin', () => {
    expect(resolveApiBase(' https://api.example.com/ ')).toBe('https://api.example.com');
    expect(resolveApiBase('http://127.0.0.1:8000')).toBe('http://127.0.0.1:8000');
  });
  it.each(['javascript:alert(1)', 'https://user:pass@example.com', 'https://example.com/api', 'https://example.com?token=x', 'https://example.com#x', '/api'])('rejects invalid endpoint configuration: %s', value => {
    expect(() => resolveApiBase(value)).toThrow();
  });
});


it('uses the configured origin for actual client health and multipart requests', async () => {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  try {
    const { getHealth, analyzeDataset } = await import('../services/api');
    const { DEFAULT_CONFIG } = await import('../utils/config');
    const fixture = (await import('./analysis.fixture.json')).default;
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok', service: 'segmentiq', api_version: '1' }), { headers: { 'Content-Type': 'application/json' } }));
    await getHealth();
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/health');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(fixture), { headers: { 'Content-Type': 'application/json' } }));
    await analyzeDataset(DEFAULT_CONFIG, new AbortController().signal);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.example.com/api/analyze');
    expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(FormData);
    expect(fetchMock.mock.calls[1][1].headers).toBeUndefined();
  } finally {
    vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules();
  }
});
