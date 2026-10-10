import { apiUrl } from './api-base';
import type { AnalysisConfig, AnalysisResponse, ApiErrorDetail, RequestError } from '../types/analysis';
import { ANALYSIS_TIMEOUT_MS, analysisFormData, validateConfig } from '../utils/config';
import { matchesContract } from './contract';

export class ApiClientError extends Error {
  constructor(public readonly failure: RequestError) { super(failure.message); }
}

async function jsonResponse(response: Response): Promise<unknown> {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new ApiClientError({ kind: 'unexpected', message: 'The service returned an unexpected response. Check that FastAPI is running and the proxy is configured.', status: response.status });
  }
  try { return await response.json(); }
  catch { throw new ApiClientError({ kind: 'unexpected', message: 'The service response was not valid JSON.', status: response.status }); }
}

export async function getHealth(signal?: AbortSignal): Promise<void> {
  const response = await fetch(apiUrl('/api/health'), { signal });
  const value = await jsonResponse(response);
  const health = value as { status?: string; service?: string } | null;
  if (!response.ok || !matchesContract(value, 'HealthResponse') || health?.status !== 'ok' || health?.service !== 'segmentiq') throw new Error('Analysis service unavailable.');
}

export async function analyzeDataset(config: AnalysisConfig, signal: AbortSignal): Promise<AnalysisResponse> {
  const errors = validateConfig(config);
  if (errors.length) throw new ApiClientError({ kind: 'validation', message: errors.join(' ') });
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, ANALYSIS_TIMEOUT_MS);
  try {
    const response = await fetch(apiUrl('/api/analyze'), { method: 'POST', body: analysisFormData(config), signal: controller.signal });
    const value = await jsonResponse(response);
    if (signal.aborted) throw new ApiClientError({ kind: 'cancelled', message: 'Stopped waiting for this request. The server may still be analyzing it.' });
    if (!response.ok) {
      if (matchesContract(value, 'ErrorResponse')) {
        const detail = (value as { error: ApiErrorDetail }).error;
        throw new ApiClientError({ kind: 'http', status: response.status, detail,
          message: response.status === 503 ? `${detail.message} Wait before trying again.` : detail.message });
      }
      throw new ApiClientError({ kind: 'unexpected', status: response.status, message: 'The service returned an unrecognized error response.' });
    }
    if (!matchesContract(value, 'AnalysisResponse')) throw new ApiClientError({ kind: 'unexpected', message: 'The analysis response does not match the API contract.' });
    return value as AnalysisResponse;
  } catch (error) {
    if (signal.aborted) throw new ApiClientError({ kind: 'cancelled', message: 'Stopped waiting for this request. The server may continue working; wait before submitting again.' });
    if (timedOut) throw new ApiClientError({ kind: 'timeout', message: 'The analysis request timed out. The server may still be working; wait before trying again.' });
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError({ kind: 'network', message: 'Cannot reach the analysis service. Check your connection and that the backend is running, then retry.' });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
