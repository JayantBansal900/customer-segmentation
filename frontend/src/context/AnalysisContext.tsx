import { useEffect, useRef, useState, type ReactNode } from 'react';
import { analyzeDataset, ApiClientError } from '../services/api';
import { DEFAULT_CONFIG } from '../utils/config';
import type { AnalysisConfig, AnalysisResponse, RequestError } from '../types/analysis';
import { AnalysisContext, type Status } from './analysis-state';

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<RequestError | null>(null);
  const [invalidated, setInvalidated] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const active = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const startedAt = useRef(0);

  useEffect(() => () => { generation.current++; active.current?.abort(); }, []);
  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 500);
    return () => clearInterval(timer);
  }, [status]);

  function updateConfig(changes: Partial<AnalysisConfig>) {
    if (Object.entries(changes).every(([key, value]) => config[key as keyof AnalysisConfig] === value)) return;
    generation.current++;
    active.current?.abort();
    active.current = null;
    if (result) setInvalidated(true);
    setConfig(previous => ({ ...previous, ...changes }));
    setResult(null); setError(null); setStatus('idle'); setElapsed(0);
  }

  async function run() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const id = ++generation.current;
    setStatus('running'); setError(null); setResult(null); setInvalidated(false); setElapsed(0);
    const started = performance.now();
    startedAt.current = started;
    try {
      const response = await analyzeDataset(config, controller.signal);
      if (id === generation.current) { setResult(response); setStatus('success'); }
    } catch (caught) {
      if (id === generation.current) {
        const failure: RequestError = caught instanceof ApiClientError ? caught.failure : { kind: 'unexpected', message: 'An unexpected client error occurred. Please retry.' };
        setError(failure); setStatus(failure.kind === 'cancelled' ? 'cancelled' : 'error');
      }
    } finally {
      if (id === generation.current) setElapsed((performance.now() - started) / 1000);
      if (active.current === controller) active.current = null;
    }
  }

  function cancel() { active.current?.abort(); }
  return <AnalysisContext.Provider value={{ config, result, status, error, invalidated, elapsed, updateConfig, run, cancel }}>{children}</AnalysisContext.Provider>;
}

