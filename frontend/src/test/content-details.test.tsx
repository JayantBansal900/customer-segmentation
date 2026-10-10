import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TechnicalDetails } from '../components/ui/TechnicalDetails';
import { Methodology } from '../pages/Methodology';
import { ClusterDetails } from '../components/segments/ClusterDetails';
import { Insights } from '../pages/Insights';
import { AnalysisContext, type AnalysisState } from '../context/analysis-state';
import { DEFAULT_CONFIG } from '../utils/config';
import type { AnalysisResponse } from '../types/analysis';
import fixture from './analysis.fixture.json';

const result = fixture as AnalysisResponse;
describe('concise content with accessible analytical details', () => {
  it('uses a closed native disclosure that opens and closes without losing its content', async () => {
    const user = userEvent.setup();
    render(<TechnicalDetails summary="Read the method"><p>Accurate technical detail.</p></TechnicalDetails>);
    const summary = screen.getByText('Read the method');
    const disclosure = summary.closest('details')!;
    expect(disclosure.open).toBe(false);
    await user.click(summary); expect(disclosure.open).toBe(true);
    expect(screen.getByText('Accurate technical detail.')).toBeVisible();
    await user.click(summary); expect(disclosure.open).toBe(false);
  });
  it('shows six pipeline steps and reveals the exact RFM reference and formulas on request', async () => {
    const user = userEvent.setup(); render(<MemoryRouter><Methodology /></MemoryRouter>);
    const stages = within(screen.getByRole('list', { name: 'Implemented segmentation pipeline' })).getAllByRole('listitem');
    expect(stages.map(stage => within(stage).getByRole('heading').textContent)).toEqual(['Upload Data', 'Clean Transactions', 'Calculate RFM', 'Prepare Features', 'Cluster Customers', 'Explore Results']);
    await user.click(screen.getByText('RFM formulas and reference date'));
    expect(screen.getByText('count distinct InvoiceNo per CustomerID')).toBeVisible();
    expect(screen.getByText(/one day after the latest retained transaction/)).toBeVisible();
    await user.click(screen.getByText('KMeans and candidate evaluation'));
    expect(screen.getByText(/random_state 42/)).toBeVisible();
    expect(screen.getByText(/same subset for every candidate/)).toBeVisible();
    await user.click(screen.getByText('Results, privacy and exports'));
    expect(screen.getByText(/pseudonymous IDs do not guarantee anonymity/)).toBeVisible();
    expect(screen.getByText(/CSV exports prefix formula-like text/)).toBeVisible();
  });
  it('retains the full API persona description behind its summary without modifying results', async () => {
    const user = userEvent.setup(); const before = structuredClone(result.segments);
    render(<ClusterDetails segments={result.segments} />);
    await user.click(screen.getByText('How this profile is described'));
    expect(screen.getByText(result.segments[0].persona_description!)).toBeVisible();
    expect(result.segments).toEqual(before);
    expect(screen.getByRole('button', { name: 'Export segments CSV' })).toBeEnabled();
  });
  it('keeps real model explanations, sampling caveats and safe-export guidance available', async () => {
    const user = userEvent.setup();
    const state: AnalysisState = { config: DEFAULT_CONFIG, result, status: 'success', error: null, invalidated: false, elapsed: 0, updateConfig: vi.fn(), run: vi.fn(), cancel: vi.fn() };
    render(<MemoryRouter><AnalysisContext.Provider value={state}><Insights /></AnalysisContext.Provider></MemoryRouter>);
    await user.click(screen.getByText('How model quality is measured'));
    expect(screen.getByText(result.model_quality.recommendation_explanation)).toBeVisible();
    expect(screen.getByText(/Small clusters may be absent/)).toBeVisible();
    await user.click(screen.getByText('How to read the PCA plot'));
    expect(screen.getByText(/not a prediction or the clustering input/)).toBeVisible();
    expect(screen.getByText(/Formula-like text gets/)).toHaveTextContent('[text]');
    expect(screen.getByRole('button', { name: 'Export all customers CSV' })).toBeEnabled();
  });
});
