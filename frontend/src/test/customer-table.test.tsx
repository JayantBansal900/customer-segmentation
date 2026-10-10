import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CustomerTable } from '../components/segments/CustomerTable';
import { ClusterDetails } from '../components/segments/ClusterDetails';
import type { Customer, Segment } from '../types/analysis';
import fixture from './analysis.fixture.json';

const customers: Customer[] = Array.from({ length: 60 }, (_, i) => ({ ...fixture.customers[0], customer_id: `ID-${String(i).padStart(4, '0')}`, monetary: i + 1, cluster_id: i % 2 }));
describe('bounded customer explorer', () => {
  it('renders only one page and supports pagination', async () => {
    const user = userEvent.setup(); render(<CustomerTable customers={customers} />);
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(26);
    await user.click(screen.getByRole('button', { name: 'Next page' })); expect(screen.getByText('ID-0025')).toBeInTheDocument(); expect(screen.queryByText('ID-0000')).not.toBeInTheDocument();
  });
  it('searches, filters clusters, sorts, and resets pagination', async () => {
    const user = userEvent.setup(); render(<CustomerTable customers={customers} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter customers by cluster' }), '1'); expect(screen.getByText('30 matching customers')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sort by Monetary value' })); await user.click(screen.getByRole('button', { name: 'Sort by Monetary value' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')[1]).toHaveTextContent('ID-0059');
    await user.type(screen.getByRole('searchbox'), '0001'); expect(screen.getByText('1 matching customers')).toBeInTheDocument(); expect(screen.getByText('ID-0001')).toBeInTheDocument();
  });
  it('handles an empty filtered result and disables export', async () => {
    const user = userEvent.setup(); render(<CustomerTable customers={customers} />); await user.type(screen.getByRole('searchbox'), 'not-present');
    expect(screen.getByText('No customers match these filters.')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Export filtered customers CSV' })).toBeDisabled();
  });
  it('creates a CSV download and releases the object URL', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:test'), revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<CustomerTable customers={customers} />); fireEvent.click(screen.getByRole('button', { name: 'Export filtered customers CSV' }));
    expect(create).toHaveBeenCalledWith(expect.any(Blob)); expect(click).toHaveBeenCalledOnce(); vi.advanceTimersByTime(1000); expect(revoke).toHaveBeenCalledWith('blob:test');
  });
  it('shows selected segment raw mean/median without invented actions', async () => {
    const user = userEvent.setup(); render(<ClusterDetails segments={fixture.segments as Segment[]} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Selected cluster' }), String(fixture.segments[1].cluster_id));
    expect(screen.getByRole('table')).toHaveAccessibleName(`Raw RFM profile for cluster ${fixture.segments[1].cluster_id}`);
    expect(screen.getByText(/No action recommendations returned/)).toBeInTheDocument();
  });
});
