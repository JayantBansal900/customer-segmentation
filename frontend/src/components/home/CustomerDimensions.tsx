import { useEffect, useRef, useState } from 'react';
import { CLUSTERS, EXAMPLE_POINTS, fallbackPosition } from './cluster-scene';
import { createPointRenderer } from './point-renderer';

export function CustomerDimensions() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const activeRef = useRef(-1);
  const invalidate = useRef<() => void>(() => {});
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [webgl, setWebgl] = useState(false);
  const [staticView, setStaticView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true);
  const active = hovered ?? selected;
  const current = active === null ? null : CLUSTERS[active];
  activeRef.current = active ?? -1;
  useEffect(() => { invalidate.current(); }, [active]);

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!preference) return;
    const changed = () => setReduced(preference.matches);
    preference.addEventListener('change', changed);
    return () => preference.removeEventListener('change', changed);
  }, []);

  useEffect(() => {
    if (!canvas.current || staticView) return;
    const element = canvas.current;
    const renderer = createPointRenderer(element);
    if (!renderer) return;
    setWebgl(true);
    let frame = 0;
    let last = 0;
    let time = 0;
    let focus = -1;
    let visible = true;
    let lost = false;
    let disposed = false;
    let lastPaint = 0;
    const schedule = () => { if (!frame && !lost && !disposed && visible && !document.hidden) frame = requestAnimationFrame(paint); };
    const paint = (timestamp: number) => {
      frame = 0;
      if (disposed || lost || !visible || document.hidden) return;
      if (!reduced && timestamp - lastPaint < 32) { schedule(); return; }
      lastPaint = timestamp;
      const delta = last ? Math.min(timestamp - last, 80) : 0;
      last = timestamp;
      if (!reduced && !paused) time += delta;
      // Static modes redraw only for selection/size changes. Animated mode is capped near 30fps.
      const target = activeRef.current;
      focus = reduced || target < 0 || focus < 0 || Math.abs(target - focus) < .001 ? target : focus + (target - focus) * .22;
      renderer.draw(reduced ? 0 : Math.sin(time / 14000) * .075, focus, element.clientWidth < 600);
      if ((!reduced && !paused) || Math.abs(target - focus) > .001) schedule();
    };
    invalidate.current = schedule;
    const resize = () => { renderer.resize(); renderer.draw(0, activeRef.current, element.clientWidth < 600); schedule(); };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(element);
    const visibility = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) { last = 0; schedule(); } else { cancelAnimationFrame(frame); frame = 0; }
    });
    if (field.current) visibility?.observe(field.current);
    const contextLost = (event: Event) => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); setWebgl(false); };
    const pageVisibility = () => { cancelAnimationFrame(frame); frame = 0; last = 0; schedule(); };
    element.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', pageVisibility);
    schedule();
    return () => {
      disposed = true; invalidate.current = () => {};
      cancelAnimationFrame(frame); observer?.disconnect(); visibility?.disconnect();
      document.removeEventListener('visibilitychange', pageVisibility);
      element.removeEventListener('webglcontextlost', contextLost); renderer.dispose(); setWebgl(false);
    };
  }, [staticView, paused, reduced]);

  return <div className="customer-dimensions">
    <div className="dimension-field" ref={field} data-renderer={webgl && !staticView ? 'webgl' : 'svg'} data-motion={reduced ? 'reduced' : paused ? 'paused' : 'gentle'}>
      <svg className="dimension-grid" viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
        {[80, 140, 200, 260, 320].map(y => <path key={y} d={`M30 ${y} Q500 ${y - 60} 970 ${y}`} />)}
        {[80, 220, 360, 500, 640, 780, 920].map(x => <path key={x} d={`M${500 + (x - 500) * .55} 30 L${x} 340`} />)}
      </svg>
      {(!webgl || staticView) && <svg className="dimension-fallback" viewBox="0 0 1000 360" preserveAspectRatio="none" role="img" aria-label="Four separated illustrative customer groups; use the group buttons for descriptions.">
        {EXAMPLE_POINTS.filter((_, i) => i % 2 === 0).map((point, i) => {
          const location = fallbackPosition(point.x, point.y, point.z);
          return <circle key={i} cx={location.x} cy={location.y} r={2.1 + point.z * .4} fill={CLUSTERS[point.group].color} opacity={active === null || active === point.group ? .83 : .14} />;
        })}
      </svg>}
      <canvas ref={canvas} className="dimension-canvas" aria-hidden="true" style={{ opacity: webgl && !staticView ? 1 : 0 }} />
      <svg className="dimension-centroids" viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
        {CLUSTERS.map((cluster, i) => {
          const location = fallbackPosition(cluster.center[0], cluster.center[1], cluster.center[2]);
          return <g key={cluster.name} opacity={active === null || active === i ? .65 : .15}>
            <circle cx={location.x} cy={location.y} r="11" fill="none" stroke={cluster.color} strokeWidth=".8" />
            <path d={`M${location.x - 5} ${location.y}h10M${location.x} ${location.y - 5}v10`} stroke={cluster.color} strokeWidth="1" />
          </g>;
        })}
      </svg>
      <div className="field-caption"><span className="field-dot" />Illustrative customer segmentation</div>
      <div className="field-tools">
        <button type="button" onClick={() => setStaticView(value => !value)} aria-pressed={staticView}>{staticView ? 'Try 3D view' : 'Use 2D view'}</button>
        <button type="button" onClick={() => setPaused(value => !value)} disabled={reduced || staticView || !webgl} aria-pressed={paused}>{reduced ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion'}</button>
      </div>
    </div>
    <div className="dimension-controls">
      <div className="cluster-picker" role="group" aria-label="Explore illustrative customer groups">
        {CLUSTERS.map((cluster, i) => <button key={cluster.name} type="button" aria-pressed={selected === i}
          onClick={() => setSelected(value => value === i ? null : i)} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)}>
          <span style={{ background: cluster.color }} aria-hidden="true" /><span>{cluster.name}</span><span className="cluster-index" aria-hidden="true">0{i + 1}</span>
        </button>)}
      </div>
      <div className="cluster-explanation" aria-live="polite" aria-atomic="true">
        <strong>{current?.name ?? 'Similar patterns. Distinct possibilities.'}</strong>
        <p>{current?.description ?? 'Select a group to see how purchase patterns can connect customers.'}</p>
        <span>Generated example · Your analysis reveals your own segments.</span>
      </div>
    </div>
  </div>;
}
