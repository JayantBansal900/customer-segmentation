import type { components } from './schema';

export type AnalysisResponse = components['schemas']['AnalysisResponse'];
export type Customer = components['schemas']['CustomerResult'];
export type Segment = components['schemas']['SegmentResult'];
export type ApiErrorDetail = components['schemas']['ErrorDetail'];
export type Preprocessing = AnalysisResponse['metadata']['preprocessing'];
export type DatasetSource = 'example' | 'csv' | 'xlsx';

export interface AnalysisConfig {
  source: DatasetSource;
  file: File | null;
  selectedK: string;
  candidateMin: string;
  candidateMax: string;
  preprocessing: Preprocessing;
  dateFormat: string;
}

export interface RequestError {
  kind: 'validation' | 'http' | 'network' | 'unexpected' | 'timeout' | 'cancelled';
  message: string;
  status?: number;
  detail?: ApiErrorDetail;
}
