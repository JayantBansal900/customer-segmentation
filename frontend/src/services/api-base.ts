/** Optional build-time origin. Empty retains the existing same-origin /api proxy. */
export function resolveApiBase(value: string | undefined): string {
  const base = value?.trim() ?? '';
  if (!base) return '';
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('VITE_API_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
  }
  return url.origin;
}

export const API_BASE_URL = resolveApiBase(import.meta.env.VITE_API_BASE_URL);
export const apiUrl = (path: '/api/health' | '/api/analyze'): string => `${API_BASE_URL}${path}`;
