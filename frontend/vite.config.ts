import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const requestTimeout = Number(env.VITE_ANALYSIS_TIMEOUT_MS || 300_000);
  if (!Number.isSafeInteger(requestTimeout) || requestTimeout <= 0) throw new Error('VITE_ANALYSIS_TIMEOUT_MS must be a positive integer.');
  const proxy = {
    '/api': {
      target: env.API_PROXY_TARGET || 'http://127.0.0.1:8000',
      changeOrigin: true,
      timeout: requestTimeout + 30_000,
      proxyTimeout: requestTimeout + 30_000,
    },
  };
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: { port: 4173, strictPort: true, proxy },
    test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'], css: false },
  };
});
