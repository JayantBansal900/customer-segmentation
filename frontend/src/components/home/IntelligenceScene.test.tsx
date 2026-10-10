import {StrictMode} from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {IntelligenceScene} from './IntelligenceScene';
import {createIntelligenceRenderer} from './intelligence-renderer';

vi.mock('./intelligence-renderer',()=>({createIntelligenceRenderer:vi.fn(()=>null)}));
const create = vi.mocked(createIntelligenceRenderer);
let preference: {matches:boolean; addEventListener:ReturnType<typeof vi.fn>; removeEventListener:ReturnType<typeof vi.fn>};
let resizeDisconnect: ReturnType<typeof vi.fn>;
let visibilityDisconnect: ReturnType<typeof vi.fn>;
let visibilityCallback: (entries:{isIntersecting:boolean}[])=>void;
let tick: FrameRequestCallback;
beforeEach(()=>{
  create.mockReset(); create.mockReturnValue(null);
  preference={matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()};
  vi.stubGlobal('matchMedia',vi.fn(()=>preference));
  vi.stubGlobal('requestAnimationFrame',vi.fn((callback:FrameRequestCallback)=>{tick=callback;return 17;}));
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  resizeDisconnect=vi.fn(); visibilityDisconnect=vi.fn();
  vi.stubGlobal('ResizeObserver',class {observe=vi.fn(); disconnect=resizeDisconnect;});
  vi.stubGlobal('IntersectionObserver',class {constructor(callback:typeof visibilityCallback){visibilityCallback=callback;} observe=vi.fn(); disconnect=visibilityDisconnect;});
});
const renderer=()=>({draw:vi.fn(),resize:vi.fn(),dispose:vi.fn()});
describe('approved intelligence scene lifecycle',()=>{
  it('keeps an accessible fallback and keyboard selection when WebGL is unavailable',async()=>{
    const user=userEvent.setup();render(<IntelligenceScene />);
    expect(screen.getByRole('img',{name:/Four luminous/})).toBeVisible();
    const group=screen.getByRole('button',{name:/Loyal Customers/});
    act(()=>group.focus());await user.keyboard('{Enter}');
    expect(group).toHaveAttribute('aria-pressed','true');
    expect(screen.getByText(/Generated example, not real analysis/)).toBeInTheDocument();
    await user.keyboard('{Enter}');expect(group).toHaveAttribute('aria-pressed','false');
  });
  it('releases both StrictMode mounts and every observer/listener on unmount',()=>{
    const first=renderer(),second=renderer();create.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const remove=vi.spyOn(document,'removeEventListener');
    const view=render(<StrictMode><IntelligenceScene /></StrictMode>);
    expect(first.dispose).toHaveBeenCalledOnce();view.unmount();expect(second.dispose).toHaveBeenCalledOnce();
    expect(resizeDisconnect).toHaveBeenCalledTimes(2);expect(visibilityDisconnect).toHaveBeenCalledTimes(2);
    expect(preference.removeEventListener).toHaveBeenCalledTimes(2);
    expect(remove.mock.calls.filter(([name])=>name==='visibilitychange')).toHaveLength(2);
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
  it('never schedules animation under reduced motion and reacts to preference changes',()=>{
    preference.matches=true;const gpu=renderer();create.mockReturnValue(gpu);render(<IntelligenceScene />);
    expect(screen.getByRole('button',{name:'Reduced motion'})).toBeDisabled();expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(gpu.draw.mock.calls.every(call=>call[1]===false)).toBe(true);
    preference.matches=false;act(()=>preference.addEventListener.mock.calls[0][1]());
    expect(screen.getByRole('button',{name:'Pause motion'})).toBeEnabled();expect(requestAnimationFrame).toHaveBeenCalledOnce();
  });
  it('stops frames offscreen and while paused, then resumes without elapsed-time jumps',async()=>{
    const user=userEvent.setup();const gpu=renderer();create.mockReturnValue(gpu);render(<IntelligenceScene />);
    act(()=>{tick(100);tick(200);});expect(gpu.draw.mock.calls.some(call=>call[0]>0)).toBe(true);
    act(()=>visibilityCallback([{isIntersecting:false}]));const count=vi.mocked(requestAnimationFrame).mock.calls.length;
    act(()=>tick(400));expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(count);
    act(()=>visibilityCallback([{isIntersecting:true}]));await user.click(screen.getByRole('button',{name:'Pause motion'}));
    const pausedCount=vi.mocked(requestAnimationFrame).mock.calls.length;act(()=>tick(500));expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(pausedCount);
    await user.click(screen.getByRole('button',{name:'Resume motion'}));expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBeGreaterThan(pausedCount);
  });
  it('disposes the GPU on explicit fallback and recreates it when returning to 3D',async()=>{
    const user=userEvent.setup();const first=renderer(),second=renderer();create.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const view=render(<IntelligenceScene />);await user.click(screen.getByRole('button',{name:'2D view'}));
    expect(first.dispose).toHaveBeenCalledOnce();expect(screen.getByRole('img',{name:/Four luminous/})).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Try 3D view'}));expect(create).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();view.unmount();expect(second.dispose).toHaveBeenCalledOnce();
  });
  it('cancels rendering and presents fallback after graphics context loss',()=>{
    const gpu=renderer();create.mockReturnValue(gpu);const view=render(<IntelligenceScene />);
    fireEvent(view.container.querySelector('canvas')!,new Event('webglcontextlost',{cancelable:true}));
    expect(gpu.dispose).toHaveBeenCalledOnce();expect(screen.getByRole('img',{name:/Four luminous/})).toBeVisible();
    view.unmount();expect(gpu.dispose).toHaveBeenCalledOnce();
  });
});
