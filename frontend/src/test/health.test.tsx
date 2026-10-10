import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getHealth } from '../services/api';
import { useHealth } from '../hooks/useHealth';

vi.mock('../services/api', () => ({ getHealth: vi.fn() }));
const health = vi.mocked(getHealth);
beforeEach(() => { health.mockReset(); });
describe('service availability state', () => {
  it('keeps a successful check online after its timeout interval', async () => {
    vi.useFakeTimers(); health.mockResolvedValue(undefined);
    const { result } = renderHook(() => useHealth());
    await act(async () => {}); expect(result.current.status).toBe('online');
    await act(async () => { await vi.advanceTimersByTimeAsync(11_000); });
    expect(result.current.status).toBe('online'); expect(vi.getTimerCount()).toBe(0);
  });
  it('reports a timeout and aborts its pending fetch', async () => {
    vi.useFakeTimers(); let signal: AbortSignal | undefined;
    health.mockImplementation(s => { signal = s; return new Promise(() => {}); });
    const { result, unmount } = renderHook(() => useHealth());
    await act(async () => { await vi.advanceTimersByTimeAsync(10_001); });
    expect(result.current.status).toBe('offline'); expect(signal?.aborted).toBe(true);
    unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it('supports an explicit retry after a failed check', async () => {
    health.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useHealth()); await act(async () => {}); expect(result.current.status).toBe('offline');
    await act(async () => result.current.retry()); expect(result.current.status).toBe('online');
  });
});
