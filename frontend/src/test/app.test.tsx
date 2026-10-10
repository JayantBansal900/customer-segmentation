import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { AnalysisProvider } from '../context/AnalysisContext';
import { analyzeDataset, ApiClientError } from '../services/api';
import type { AnalysisResponse } from '../types/analysis';
import fixture from './analysis.fixture.json';

vi.mock('../services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getHealth: vi.fn().mockResolvedValue(undefined), analyzeDataset: vi.fn() };
});

const value = fixture as AnalysisResponse;
const api = vi.mocked(analyzeDataset);
beforeEach(() => { api.mockReset(); api.mockResolvedValue(structuredClone(value)); });
function app(path = '/') {
  render(<MemoryRouter initialEntries={[path]}><AnalysisProvider><App /></AnalysisProvider></MemoryRouter>);
  return userEvent.setup();
}
function nav(name: string) { return within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name }); }

describe('routes and guided analysis', () => {
  it('connects both approved Home CTAs to real routes and uses Segmentra titles', async () => {
    const user = app();
    await user.click(screen.getAllByRole('link', { name: 'Start Analyzing' })[0]);
    expect(screen.getByRole('heading', { name: 'Analyze your customers' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Upload custom CSV' })).toBeEnabled();
    expect(document.title).toBe('Segmentra — Analyze');
    await user.click(nav('Home'));
    await user.click(screen.getByRole('link', { name: 'Explore Methodology' }));
    expect(screen.getByRole('heading', { name: 'From transactions to intelligence.' })).toBeInTheDocument();
    expect(document.title).toBe('Segmentra — Methodology');
    expect(api).not.toHaveBeenCalled();
  });

  it('navigates every route using router links with an active state', async () => {
    const user = app();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Discover the patterns');
    for (const [name, heading] of [['Analyze', 'Analyze your customers'], ['Segments', 'Your customers, decoded.'], ['Insights', 'Intelligence behind the segments.'], ['Methodology', 'From transactions to intelligence.'], ['About', 'Making customer behavior understandable.'], ['Home', 'Discover the patterns']]) {
      await user.click(nav(name)); expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading); expect(nav(name)).toHaveAttribute('aria-current', 'page');
    }
    expect(api).not.toHaveBeenCalled();
  });
  it('supports direct routes and a useful unknown-route state', () => {
    app('/missing-page'); expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
  });
  it('disables invalid configuration and preserves independent selected/candidate K', async () => {
    const user = app('/analyze');
    const selected = screen.getByRole('spinbutton', { name: 'Selected K' });
    await user.clear(selected); await user.type(selected, '1');
    expect(screen.getByRole('button', { name: 'Run Segmentation' })).toBeDisabled();
    await user.clear(selected); await user.type(selected, '10');
    expect(screen.getByRole('spinbutton', { name: 'Candidate K maximum' })).toHaveValue(6);
    expect(screen.getByRole('button', { name: 'Run Segmentation' })).toBeEnabled();
  });
  it('selects custom CSV, parses a small quoted preview, and sends the uploaded file', async () => {
    const user = app('/analyze');
    await user.click(screen.getByRole('radio', { name: 'Upload custom CSV' }));
    const file = new File(['CustomerID,InvoiceNo,InvoiceDate,Quantity,UnitPrice\n"0001",I1,2024-01-01,1,2'], 'input.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/^Dataset file/), file);
    expect(await screen.findByRole('table', { name: 'Transaction preview' })).toBeInTheDocument();
    expect(screen.getByText('0001')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run Segmentation' }));
    await screen.findByRole('heading', { name: 'Analysis complete' });
    expect(api.mock.calls[0][0]).toMatchObject({ source: 'csv', file });
  });
  it('detects XLSX selection and never leaves the example selected', async () => {
    const user = app('/analyze');
    await user.click(screen.getByRole('radio', { name: 'Upload custom CSV' }));
    const file = new File(['workbook'], 'input.xlsx');
    await user.upload(screen.getByLabelText(/^Dataset file/), file);
    expect(screen.getByRole('radio', { name: 'Upload custom XLSX' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Built-in Online Retail dataset' })).not.toBeChecked();
    expect(screen.getByText(/XLSX records are inspected on the server/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run Segmentation' }));
    expect(api.mock.calls[0][0]).toMatchObject({ source: 'xlsx', file });
  });
  it('shows honest loading, prevents duplicate submissions, and preserves results across navigation', async () => {
    let resolve!: (response: AnalysisResponse) => void;
    api.mockImplementation(() => new Promise(r => { resolve = r; }));
    const user = app('/analyze');
    await user.click(screen.getByRole('button', { name: 'Run Segmentation' }));
    expect(screen.getByText('Uploading and analyzing your dataset…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analysis running…' })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Selected K' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Analysis running…' }));
    expect(api).toHaveBeenCalledTimes(1);
    await user.click(nav('Segments')); expect(screen.getByRole('heading', { name: 'Your analysis is running' })).toBeInTheDocument();
    await act(async () => resolve(value));
    expect(await screen.findByRole('heading', { name: 'Customer explorer' })).toBeInTheDocument();
    await user.click(nav('Insights')); expect(screen.getByRole('heading', { name: 'Candidate K evaluation' })).toBeInTheDocument();
    await user.click(nav('Analyze')); expect(screen.getByRole('heading', { name: 'Analysis complete' })).toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1);
  });
  it('invalidates results when configuration changes', async () => {
    const user = app('/analyze'); await user.click(screen.getByRole('button', { name: 'Run Segmentation' })); await screen.findByRole('heading', { name: 'Analysis complete' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Preprocessing mode' }), 'log1p_standard');
    expect(screen.queryByRole('heading', { name: 'Analysis complete' })).not.toBeInTheDocument();
    expect(screen.getByText(/Results cleared:/)).toBeInTheDocument();
    await user.click(nav('Segments')); expect(screen.getByText(/Results were cleared after/)).toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1);
  });
  it('clears loading on cancellation and permits a later request', async () => {
    api.mockImplementationOnce((_config, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new ApiClientError({ kind: 'cancelled', message: 'The server may continue working.' })))));
    const user = app('/analyze'); await user.click(screen.getByRole('button', { name: 'Run Segmentation' })); await user.click(screen.getByRole('button', { name: 'Stop waiting' }));
    expect(await screen.findByRole('heading', { name: 'Request wait cancelled' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Segmentation' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Run Segmentation' })); await screen.findByRole('heading', { name: 'Analysis complete' }); expect(api).toHaveBeenCalledTimes(2);
  });
  it('recovers from a real-shaped API error without retaining stale results', async () => {
    api.mockRejectedValueOnce(new ApiClientError({ kind: 'http', status: 503, message: 'Analysis capacity is busy; wait before retrying.' }));
    const user = app('/analyze'); await user.click(screen.getByRole('button', { name: 'Run Segmentation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Analysis capacity is busy');
    expect(screen.getByRole('button', { name: 'Run Segmentation' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Run Segmentation' })); await screen.findByRole('heading', { name: 'Analysis complete' }); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('renders unavailable metrics explicitly in insights', async () => {
    const unavailable = structuredClone(value); unavailable.metadata.recommended_k = null; unavailable.model_quality.selected.silhouette = null;
    unavailable.model_quality.pca.pc1_explained_variance_ratio = null; unavailable.model_quality.pca.pc2_explained_variance_ratio = null;
    unavailable.customers = unavailable.customers.map(c => ({ ...c, pc1: null, pc2: null }));
    api.mockResolvedValue(unavailable);
    const user = app('/analyze'); await user.click(screen.getByRole('button', { name: 'Run Segmentation' })); await screen.findByRole('heading', { name: 'Analysis complete' }); await user.click(nav('Insights'));
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('PCA coordinates are unavailable for this result.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('NaN');
  });
  it('renders backend field, row, and correlation details for validation errors', async () => {
    api.mockRejectedValueOnce(new ApiClientError({ kind: 'http', status: 422, message: 'Dataset failed validation.',
      detail: { code: 'analysis_validation_error', message: 'Dataset failed validation.', stage: 'ingestion', request_id: 'test-request',
        issues: [{ code: 'invalid_numeric', message: 'Quantity must be finite.', column: 'Quantity', rows: [2], location: [] }], context: {} } }));
    const user = app('/analyze'); await user.click(screen.getByRole('button', { name: 'Run Segmentation' }));
    const alert = await screen.findByRole('alert'); expect(alert).toHaveTextContent('Quantity: Quantity must be finite. (rows 2)');
    expect(alert).toHaveTextContent('test-request'); expect(alert).toHaveTextContent('ingestion');
  });
});
