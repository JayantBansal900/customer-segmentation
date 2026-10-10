import { createContext, useContext } from 'react';
import type { AnalysisConfig, AnalysisResponse, RequestError } from '../types/analysis';

export type Status = 'idle' | 'running' | 'success' | 'error' | 'cancelled';
export interface AnalysisState {
  config: AnalysisConfig;
  result: AnalysisResponse | null;
  status: Status;
  error: RequestError | null;
  invalidated: boolean;
  elapsed: number;
  updateConfig: (changes: Partial<AnalysisConfig>) => void;
  run: () => Promise<void>;
  cancel: () => void;
}

// Keep context identity/hooks separate from the component's Fast Refresh boundary.
export const AnalysisContext = createContext<AnalysisState | null>(null);
export function useAnalysis() {
  const state = useContext(AnalysisContext);
  if (!state) throw new Error('AnalysisProvider is required.');
  return state;
}
