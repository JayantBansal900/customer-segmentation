import {colors, points, layoutFor, type Layout} from './intelligence-data';
import {createIntelligenceRenderer} from './intelligence-renderer';
export interface SceneState { reduced: boolean; paused: boolean; fallback: boolean }
export interface SceneController { highlight(index: number): void; toggleView(): void; toggleMotion(): void; dispose(): void }
export interface SceneElements { scene: HTMLDivElement; canvas: HTMLCanvasElement; svg: SVGSVGElement; flows: SVGGElement; orbits: SVGGElement; trail: string }
const namespace = 'http://www.w3.org/2000/svg';
function svgElement(name: string, attributes: Record<string, string | number>) {
  const element = document.createElementNS(namespace, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}
function paths(scene: HTMLElement, flows: SVGGElement, orbits: SVGGElement, layout: Layout, active: number, trail: string) {
  flows.replaceChildren(); orbits.replaceChildren();
  const [sx, sy] = layout[4].map((value,i) => value * (i ? 650 : 1000));
  layout.slice(0,4).forEach(([nx,ny], group) => {
    const cx = nx * 1000, cy = ny * 650;
    for (let i=0;i<5;i++) {
      const y = sy + (i-2)*11;
      const d = `M${sx-76} ${y+22*Math.sin(group)} C${sx+105} ${y+40},${cx-158} ${cy-25},${cx-18} ${cy+6*(i-2)}`;
      flows.append(svgElement('path',{d,fill:'none',stroke:`url(#${trail})`,'stroke-width':i===2?'1.05':'.65',opacity:group===active||active<0?'.85':'.15'}));
      if(i===2)flows.append(svgElement('path',{d,fill:'none',stroke:colors[group],'stroke-width':'1.2',opacity:group===active||active<0?'.65':'.1',class:'flow-tracer',pathLength:'1000','stroke-dasharray':'16 1100',style:`animation-delay:-${group*4}s`}));
    }
    const scale = scene.clientWidth < 760 ? Math.min(scene.clientWidth/480,scene.clientHeight/550) : Math.min(scene.clientWidth/1300,scene.clientHeight/740);
    const rx = 92*scale/scene.clientWidth*1000, ry = 86*scale/scene.clientHeight*650;
    orbits.append(svgElement('ellipse',{cx,cy,rx,ry,fill:'none',stroke:colors[group],'stroke-width':'.7',opacity:group===active||active<0?'.32':'.07',transform:`rotate(${group%2?18:-22} ${cx} ${cy})`}));
    orbits.append(svgElement('ellipse',{cx,cy,rx:rx*1.13,ry:ry*.34,fill:'none',stroke:colors[group],'stroke-width':'.6',opacity:group===active||active<0?'.23':'.04',transform:`rotate(${group%2?-30:30} ${cx} ${cy})`}));
  });
}
function fallback(scene: HTMLElement, svg: SVGSVGElement, layout: Layout, active: number) {
  const fragment = document.createDocumentFragment();
  const scale = scene.clientWidth < 760 ? Math.min(scene.clientWidth/480,scene.clientHeight/550) : Math.min(scene.clientWidth/1300,scene.clientHeight/740);
  points.filter((_,i)=>i%4===0).forEach(point => {
    const depth = 600/(600-point.z);
    const [cx,cy] = layout[point.group];
    fragment.append(svgElement('circle',{
      cx:cx*1000+point.x*depth*scale/scene.clientWidth*1000,
      cy:cy*650+point.y*depth*scale/scene.clientHeight*650,
      r:point.size*1.15*1000/scene.clientWidth,
      fill:colors[point.group],
      opacity:(active<0||active===point.group||point.group===4?.78:.09)*(point.group===4?.3:point.brightness),
    }));
  });
  svg.replaceChildren(fragment);
}

// Each mount owns its renderer, observers, listeners, and animation frame.
// React owns controls and label state; only the canvas and empty SVG groups are imperative.
export function mountIntelligenceScene(elements: SceneElements, update: (state: SceneState) => void): SceneController {
  const {scene, canvas, svg, flows, orbits, trail} = elements;
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduced = preference?.matches ?? true, paused = false, useSvg = false, active = -1;
  let renderer = createIntelligenceRenderer(canvas, scene);
  let frame = 0, time = 0, last = 0, lastPaint = 0, visible = true, disposed = false;
  let layout = layoutFor(scene.clientWidth);
  const cancel = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
  const publish = () => {
    canvas.hidden = useSvg; svg.toggleAttribute('hidden', !useSvg);
    scene.dataset.motion = reduced ? 'reduced' : paused ? 'paused' : 'gentle';
    scene.dataset.renderer = useSvg ? 'svg' : 'webgl';
    update({reduced, paused, fallback:useSvg});
  };
  const draw = () => {
    if (disposed) return;
    paths(scene, flows, orbits, layout, active, trail);
    if (useSvg) fallback(scene, svg, layout, active);
    else renderer?.draw(time, !reduced && !paused, active, layout);
  };
  const schedule = () => { if (!frame && !disposed && !document.hidden && visible && !useSvg && renderer && !reduced && !paused) frame = requestAnimationFrame(paint); };
  function paint(timestamp: number) {
    frame = 0;
    if (disposed || document.hidden || !visible || useSvg || !renderer || reduced || paused) return;
    if (timestamp-lastPaint < 32) { schedule(); return; }
    lastPaint = timestamp;
    time += last ? Math.min(timestamp-last,80) : 0; last = timestamp;
    renderer.draw(time, true, active, layout); schedule();
  }
  const resize = () => { if (disposed) return; layout = layoutFor(scene.clientWidth); renderer?.resize(); draw(); schedule(); };
  const preferenceChanged = () => { reduced = preference?.matches ?? true; cancel(); publish(); draw(); schedule(); };
  const visibilityChanged = () => { cancel(); scene.dataset.visibility = document.hidden || !visible ? 'hidden' : 'visible'; schedule(); };
  const contextLost = (event: Event) => { event.preventDefault(); cancel(); renderer?.dispose(); renderer = null; useSvg = true; publish(); draw(); };
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  const visibility = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; visibilityChanged(); });
  observer?.observe(scene); visibility?.observe(scene);
  preference?.addEventListener('change',preferenceChanged);
  document.addEventListener('visibilitychange',visibilityChanged);
  window.addEventListener('resize',resize);
  canvas.addEventListener('webglcontextlost',contextLost);
  useSvg = !renderer; resize(); publish();
  return {
    highlight(index) { active = index; draw(); },
    toggleView() {
      cancel();
      if (!useSvg) { renderer?.dispose(); renderer = null; useSvg = true; }
      else { renderer = createIntelligenceRenderer(canvas,scene); useSvg = !renderer; }
      resize(); publish();
    },
    toggleMotion() { paused = !paused; cancel(); publish(); draw(); schedule(); },
    dispose() {
      if (disposed) return; disposed = true; cancel();
      observer?.disconnect(); visibility?.disconnect();
      preference?.removeEventListener('change',preferenceChanged);
      document.removeEventListener('visibilitychange',visibilityChanged);
      window.removeEventListener('resize',resize);
      canvas.removeEventListener('webglcontextlost',contextLost);
      renderer?.dispose(); renderer = null;
      flows.replaceChildren(); orbits.replaceChildren(); svg.replaceChildren();
    },
  };
}
