import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { AnalysisProvider } from '../context/AnalysisContext';
import { analyzeDataset } from '../services/api';
import type { AnalysisResponse } from '../types/analysis';
import { MAX_UPLOAD_BYTES } from '../utils/config';
import fixture from './analysis.fixture.json';

vi.mock('../services/api',async original=>({ ...await original<typeof import('../services/api')>(), getHealth:vi.fn().mockResolvedValue(undefined), analyzeDataset:vi.fn() }));
const api=vi.mocked(analyzeDataset);
const response=fixture as AnalysisResponse;
beforeEach(()=>{api.mockReset();api.mockResolvedValue(structuredClone(response));});
function app() {render(<MemoryRouter initialEntries={['/analyze']}><AnalysisProvider><App /></AnalysisProvider></MemoryRouter>);return userEvent.setup();}
function drop(files:File[]) {fireEvent.drop(screen.getByRole('group',{name:'Dataset upload zone'}),{dataTransfer:{files}});}
const csv=()=>new File(['CustomerID,InvoiceNo,InvoiceDate,Quantity,UnitPrice\n0001,I1,2024-01-01,1,2'],'transactions.csv',{type:'text/csv'});

describe('premium Analyze upload interactions',()=>{
  it('accepts a drop from example mode and sends the same File through the existing context',async()=>{
    const user=app();const file=csv();drop([file]);
    expect(screen.getByRole('radio',{name:'Upload custom CSV'})).toBeChecked();
    expect(await screen.findByRole('table',{name:'Transaction preview'})).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Run Segmentation'}));
    await screen.findByRole('heading',{name:'Analysis complete'});
    expect(api.mock.calls[0][0]).toMatchObject({source:'csv',file});
  });
  it('switches to XLSX on drop and keeps dates handled by the backend',()=>{
    app();drop([new File(['workbook'],'retail.xlsx')]);
    expect(screen.getByRole('radio',{name:'Upload custom XLSX'})).toBeChecked();
    expect(screen.getByLabelText(/^Optional date format/)).toBeDisabled();
    expect(screen.getByText(/XLSX records are inspected on the server/)).toBeInTheDocument();
  });
  it('keeps the current selection after a multi-file drop and provides recovery',async()=>{
    const user=app();drop([csv(),csv()]);
    expect(screen.getByRole('alert')).toHaveTextContent('one CSV or XLSX');
    expect(screen.getByRole('radio',{name:'Built-in Online Retail dataset'})).toBeChecked();
    expect(screen.getByRole('button',{name:'Run Segmentation'})).toBeDisabled();
    await user.click(screen.getByRole('button',{name:'Dismiss upload error'}));
    expect(screen.getByRole('button',{name:'Run Segmentation'})).toBeEnabled();
    expect(api).not.toHaveBeenCalled();
  });
  it.each([
    ['unsupported',()=>new File(['data'],'wrong.txt'),'Choose a .csv file'],
    ['empty',()=>new File([],'empty.csv'),'selected file is empty'],
    ['oversized',()=>{const file=csv();Object.defineProperty(file,'size',{value:MAX_UPLOAD_BYTES+1});return file;},'upload-size limit'],
  ])('retains existing validation for %s files',(_name,make,message)=>{
    app();drop([make()]);
    expect(within(screen.getByRole('group',{name:'Dataset upload zone'})).getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button',{name:'Run Segmentation'})).toBeDisabled();expect(api).not.toHaveBeenCalled();
  });
  it('opens the native file input from a keyboard-activated Browse control',async()=>{
    const user=app();const click=vi.spyOn(HTMLInputElement.prototype,'click');
    act(()=>screen.getByRole('button',{name:'Browse files'}).focus());await user.keyboard('{Enter}');
    expect(click).toHaveBeenCalledOnce();
    await user.upload(screen.getByLabelText('Dataset file'),csv());
    expect(screen.getByRole('radio',{name:'Upload custom CSV'})).toBeChecked();
  });
  it('removes the selected file without changing the upload source',async()=>{
    const user=app();drop([csv()]);await user.click(screen.getByRole('button',{name:'Remove file'}));
    expect(screen.getByRole('radio',{name:'Upload custom CSV'})).toBeChecked();
    expect(screen.getByRole('button',{name:'Browse files'})).toBeEnabled();
    expect(screen.getByRole('button',{name:'Run Segmentation'})).toBeDisabled();
  });
  it('ignores file drops while processing and retains the running configuration',async()=>{
    let resolve!:(result:AnalysisResponse)=>void;api.mockImplementation(()=>new Promise(r=>{resolve=r;}));
    const user=app();await user.click(screen.getByRole('button',{name:'Run Segmentation'}));drop([csv()]);
    expect(screen.getByRole('radio',{name:'Built-in Online Retail dataset'})).toBeChecked();
    expect(screen.getByRole('button',{name:'Browse files'})).toBeDisabled();
    expect(api.mock.calls[0][0].source).toBe('example');
    await act(async()=>resolve(response));
  });
  it('preserves the selected file and preview after navigating away and back',async()=>{
    const user=app();drop([csv()]);await screen.findByRole('table',{name:'Transaction preview'});
    const navigation=within(screen.getByRole('navigation',{name:'Main navigation'}));
    await user.click(navigation.getByRole('link',{name:'Methodology'}));
    await user.click(navigation.getByRole('link',{name:'Analyze'}));
    expect(screen.getByRole('radio',{name:'Upload custom CSV'})).toBeChecked();
    expect(await screen.findByRole('table',{name:'Transaction preview'})).toBeInTheDocument();
  });
});
