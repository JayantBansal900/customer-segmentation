import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SegmentDistribution, SegmentRFMComparison } from '../components/segments/SegmentComparison';
import { PCAProjection } from '../components/charts/PCAProjection';
import { CandidateComparison } from '../components/charts/CandidateComparison';
import { About } from '../pages/About';
import { Methodology } from '../pages/Methodology';
import { Insights } from '../pages/Insights';
import { Segments } from '../pages/Segments';
import { AnalysisContext, type AnalysisState } from '../context/analysis-state';
import { DEFAULT_CONFIG } from '../utils/config';
import { clusterColor } from '../utils/cluster-colors';
import { formatNumber } from '../utils/format';
import type { AnalysisResponse, Customer, Segment } from '../types/analysis';
import fixture from './analysis.fixture.json';

const result=fixture as AnalysisResponse;
function withResult(page: React.ReactNode, value:AnalysisResponse|null=result){
  const state:AnalysisState={config:DEFAULT_CONFIG,result:value,status:value?'success':'idle',error:null,invalidated:false,elapsed:0,updateConfig:vi.fn(),run:vi.fn(),cancel:vi.fn()};
  return render(<MemoryRouter><AnalysisContext.Provider value={state}>{page}</AnalysisContext.Provider></MemoryRouter>);
}

describe('Phase 4B analytical interactions',()=>{
  it('uses all returned clusters and reports interactive selection without modifying results',async()=>{
    const user=userEvent.setup(),select=vi.fn();const segments:Segment[]=Array.from({length:9},(_,i)=>({...result.segments[0],cluster_id:i}));
    render(<SegmentDistribution segments={segments} selected={8} onSelect={select}/>);
    expect(screen.getAllByRole('button')).toHaveLength(9);expect(screen.getAllByRole('button')[8]).toHaveAttribute('aria-pressed','true');
    await user.click(screen.getAllByRole('button')[7]);expect(select).toHaveBeenCalledWith(7);expect(clusterColor(8)).toBe(clusterColor(0));
  });
  it('changes raw RFM metric and aggregation from returned profiles',async()=>{
    const user=userEvent.setup();render(<SegmentRFMComparison segments={result.segments}/>);
    await user.selectOptions(screen.getByRole('combobox',{name:'RFM metric'}),'monetary');await user.selectOptions(screen.getByRole('combobox',{name:'Profile aggregation'}),'mean_rfm');
    const bars=screen.getByRole('list',{name:'Mean Monetary (retained purchase value)'});
    expect(within(bars).getAllByRole('listitem')[0]).toHaveTextContent(formatNumber(result.segments[0].mean_rfm.monetary));
  });
  it('shows exact real PCA details and respects legend visibility',async()=>{
    const user=userEvent.setup(),customer=result.customers.find(c=>c.pc1!=null&&c.pc2!=null)!;render(<PCAProjection customers={result.customers}/>);
    await user.type(screen.getByRole('textbox',{name:'Inspect PCA customer ID'}),customer.customer_id);
    expect(screen.getByRole('status')).toHaveTextContent(`Customer ${customer.customer_id} · Cluster ${customer.cluster_id}`);
    expect(screen.getByRole('status')).toHaveTextContent(`PC1 ${formatNumber(customer.pc1)}`);
    const toggle=screen.getByRole('button',{name:`Cluster ${customer.cluster_id}`});await user.click(toggle);expect(toggle).toHaveAttribute('aria-pressed','false');expect(screen.getByRole('status')).toHaveTextContent('No visible customer');await user.click(toggle);expect(screen.getByRole('status')).toHaveTextContent(customer.customer_id);
  });
  it('does not plot unavailable coordinates as genuine points',()=>{
    const customers:Customer[]=result.customers.map(c=>({...c,pc1:null,pc2:null}));render(<PCAProjection customers={customers}/>);
    expect(screen.getByText('PCA coordinates are unavailable for this result.')).toBeInTheDocument();expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('plots negative silhouette accurately and marks selection independently',()=>{
    const quality=structuredClone(result.model_quality);quality.candidates=[{...quality.candidates[0],k:2,silhouette:-.25},{...quality.candidates[0],k:3,silhouette:.75}];
    render(<CandidateComparison quality={quality} selectedK={2}/>);
    const selected=document.querySelector('circle[aria-label="K 2: silhouette -0.2500, selected"]');expect(selected).toHaveAttribute('cy','128.25');expect(document.querySelectorAll('circle')).toHaveLength(2);
  });
  it('explains chosen K outside the candidate set without adding a fake score',()=>{
    const quality=structuredClone(result.model_quality);quality.candidates=[{...quality.candidates[0],k:2,silhouette:.4}];render(<CandidateComparison quality={quality} selectedK={4}/>);
    expect(screen.getByText(/Your chosen K was not evaluated/)).toBeInTheDocument();expect(document.querySelectorAll('circle')).toHaveLength(1);
  });
  it('explains unavailable candidate scores without fabricating points',()=>{
    const quality=structuredClone(result.model_quality);quality.candidates=quality.candidates.map(c=>({...c,silhouette:null}));render(<CandidateComparison quality={quality} selectedK={2}/>);
    expect(screen.getByText('No valid silhouette scores are available for these candidates.')).toBeInTheDocument();expect(document.querySelector('circle')).toBeNull();
  });
  it('keeps polished empty states linked to Analyze',()=>{
    withResult(<Segments/>,null);expect(screen.getByRole('link',{name:'Go to Analyze'})).toHaveAttribute('href','/analyze');expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('keeps the chosen and recommended K distinct in Insights',()=>{
    const value=structuredClone(result);value.metadata.selected_k=3;value.metadata.recommended_k=2;withResult(<Insights/>,value);
    const metrics=document.querySelector('.insights-model .metrics')!;expect(within(metrics as HTMLElement).getByText('Selected K').nextElementSibling).toHaveTextContent('3');expect(within(metrics as HTMLElement).getByText('Recommended K').nextElementSibling).toHaveTextContent('2');
  });
});

describe('project transparency and links',()=>{
  it('explains six user-facing stages and retains accurate invoice aggregation',()=>{
    render(<MemoryRouter><Methodology/></MemoryRouter>);expect(within(screen.getByRole('list',{name:'Implemented segmentation pipeline'})).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('count distinct InvoiceNo per CustomerID')).toBeInTheDocument();expect(screen.getByText(/one day after the latest retained transaction/)).toBeInTheDocument();expect(screen.getByRole('link',{name:/Start Analyzing/})).toHaveAttribute('href','/analyze');
  });
  it('labels conceptual artwork and links About actions to actual routes',()=>{
    render(<MemoryRouter><About/></MemoryRouter>);expect(screen.getByRole('img')).toHaveAccessibleName(/not analysis data/);expect(screen.getByRole('link',{name:/Start Analyzing/})).toHaveAttribute('href','/analyze');expect(screen.getByRole('link',{name:/Explore Methodology/})).toHaveAttribute('href','/methodology');
  });
});

