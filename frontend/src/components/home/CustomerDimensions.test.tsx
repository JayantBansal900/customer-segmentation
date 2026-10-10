import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerDimensions } from './CustomerDimensions';
import { createPointRenderer } from './point-renderer';

vi.mock('./point-renderer', () => ({ createPointRenderer: vi.fn(() => null) }));
const create = vi.mocked(createPointRenderer);
function preference(reduced: boolean) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
}
beforeEach(() => { create.mockReset(); create.mockReturnValue(null); preference(false); });

describe('illustrative Home customer dimensions', () => {
  it('offers a labeled SVG fallback when WebGL is unavailable', () => {
    render(<CustomerDimensions />);
    expect(screen.getByRole('img', { name: /Four separated illustrative/ })).toBeInTheDocument();
    expect(screen.getByText('Illustrative customer segmentation')).toBeInTheDocument();
    expect(screen.getByText(/Generated example/)).toBeInTheDocument();
  });
  it('supports named group selection with the keyboard without claiming real results', async () => {
    const user = userEvent.setup(); render(<CustomerDimensions />);
    const picker = screen.getByRole('group', { name: 'Explore illustrative customer groups' });
    const group = within(picker).getByRole('button', { name: 'Recent arrivals' });
    act(() => group.focus()); await user.keyboard('{Enter}');
    expect(group).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('A group connected by more recent purchase activity.')).toBeVisible();
    await user.keyboard('{Enter}'); expect(group).toHaveAttribute('aria-pressed', 'false');
  });
  it('renders reduced motion without automatic camera movement and releases resources', () => {
    preference(true);
    const draw = vi.fn(), dispose = vi.fn();
    create.mockReturnValue({ draw, dispose, resize: vi.fn() });
    let tick: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { tick = callback; return 42; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const view = render(<CustomerDimensions />);
    expect(screen.getByRole('button', { name: 'Reduced motion' })).toBeDisabled();
    act(() => tick?.(1000)); expect(draw.mock.calls.every(call => call[0] === 0)).toBe(true);
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    view.unmount(); expect(dispose).toHaveBeenCalledOnce(); expect(cancelAnimationFrame).toHaveBeenCalled();
  });
  it('allows the same accessible fallback to be chosen explicitly', async () => {
    const user = userEvent.setup();
    const dispose = vi.fn(); create.mockReturnValue({ draw: vi.fn(), resize: vi.fn(), dispose });
    const view = render(<CustomerDimensions />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use 2D view' }));
    expect(screen.getByRole('img', { name: /Four separated illustrative/ })).toBeVisible();
    expect(dispose).toHaveBeenCalledOnce(); view.unmount();
  });
  it('falls back if the graphics context is lost', () => {
    create.mockReturnValue({ draw: vi.fn(), resize: vi.fn(), dispose: vi.fn() });
    const view = render(<CustomerDimensions />);
    fireEvent(view.container.querySelector('canvas')!, new Event('webglcontextlost', { cancelable: true }));
    expect(screen.getByRole('img', { name: /Four separated illustrative/ })).toBeVisible();
  });
  it('animates gently only when motion is allowed, with a working pause control', async () => {
    const user = userEvent.setup(); const draw = vi.fn();
    create.mockReturnValue({ draw, resize: vi.fn(), dispose: vi.fn() });
    let tick: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { tick = callback; return 9; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    render(<CustomerDimensions />);
    act(() => { tick?.(100); tick?.(200); });
    expect(draw.mock.calls.some(call => call[0] > 0 && call[0] <= .075)).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Pause motion' }));
    expect(screen.getByRole('button', { name: 'Resume motion' })).toHaveAttribute('aria-pressed', 'true');
    const before = vi.mocked(requestAnimationFrame).mock.calls.length;
    act(() => tick?.(300)); expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(before);
  });
});
