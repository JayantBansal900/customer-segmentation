import type { AnalysisConfig } from '../types/analysis';

export const DEFAULT_CONFIG: AnalysisConfig = {
  source: 'example', file: null, selectedK: '4', candidateMin: '2', candidateMax: '6',
  preprocessing: 'raw_standard', dateFormat: '',
};

function positiveSetting(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error('Frontend resource settings must be positive integers.');
  return number;
}

export const MAX_UPLOAD_BYTES = positiveSetting(import.meta.env.VITE_MAX_UPLOAD_BYTES, 64 * 1024 * 1024);
export const ANALYSIS_TIMEOUT_MS = positiveSetting(import.meta.env.VITE_ANALYSIS_TIMEOUT_MS, 300_000);

export function validateConfig(config: AnalysisConfig): string[] {
  const errors: string[] = [];
  for (const [label, value] of [['Selected K', config.selectedK], ['Candidate minimum', config.candidateMin], ['Candidate maximum', config.candidateMax]]) {
    if (!/^\d+$/.test(value) || Number(value) < 2 || Number(value) > 50) errors.push(`${label} must be an integer from 2 to 50.`);
  }
  const min = Number(config.candidateMin), max = Number(config.candidateMax);
  if (min > max) errors.push('Candidate maximum must be at least the minimum.');
  if (max - min + 1 > 10) errors.push('Choose at most 10 consecutive candidate values.');
  if (config.dateFormat.length > 100) errors.push('Date format must be at most 100 characters.');
  if (config.source !== 'example') {
    if (!config.file) errors.push('Choose a dataset file.');
    else {
      const extension = config.file.name.split('.').pop()?.toLowerCase();
      if (extension !== config.source) errors.push(`Choose a .${config.source} file for this source.`);
      if (config.file.size === 0) errors.push('The selected file is empty.');
      if (config.file.size > MAX_UPLOAD_BYTES) errors.push('The selected file exceeds the preliminary upload-size limit.');
    }
  }
  return errors;
}

export function analysisFormData(config: AnalysisConfig): FormData {
  const form = new FormData();
  form.set('selected_k', config.selectedK);
  form.set('candidate_k_min', config.candidateMin);
  form.set('candidate_k_max', config.candidateMax);
  form.set('preprocessing', config.preprocessing);
  if (config.dateFormat.trim()) form.set('date_format', config.dateFormat.trim());
  if (config.source === 'example') form.set('use_example', 'true');
  else if (config.file) form.set('file', config.file, config.file.name);
  return form;
}
