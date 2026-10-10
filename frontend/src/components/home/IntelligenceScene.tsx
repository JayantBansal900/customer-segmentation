import {useEffect, useId, useRef, useState} from 'react';
import {groups} from './intelligence-data';
import {mountIntelligenceScene, type SceneController, type SceneState} from './intelligence-controller';

export function IntelligenceScene() {
  const scene = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<SVGSVGElement>(null);
  const flows = useRef<SVGGElement>(null);
  const orbits = useRef<SVGGElement>(null);
  const controller = useRef<SceneController | null>(null);
  const trail = `trail-${useId().replace(/:/g,'')}`;
  const [state,setState] = useState<SceneState>({reduced:true, paused:false, fallback:true});
  const [selected,setSelected] = useState(-1);
  const [hovered,setHovered] = useState(-1);
  const active = hovered < 0 ? selected : hovered;

  useEffect(() => {
    if (!scene.current || !canvas.current || !fallback.current || !flows.current || !orbits.current) return;
    const instance = mountIntelligenceScene({scene:scene.current,canvas:canvas.current,svg:fallback.current,flows:flows.current,orbits:orbits.current,trail},setState);
    controller.current = instance;
    return () => { controller.current = null; instance.dispose(); };
  },[trail]);
  useEffect(() => { controller.current?.highlight(active); },[active]);

  return <>
    <div className="scene" ref={scene} role="group" aria-label="Illustrative customer intelligence scene">
      <div className="data-ghost ghost-one" aria-hidden="true"><span>Customer patterns</span><i /><i /><i /><i /><i /></div>
      <div className="data-ghost ghost-two" aria-hidden="true"><span>Purchase activity</span><i /><i /><i /><i /></div>
      <div className="cluster-light light-teal" /><div className="cluster-light light-coral" /><div className="cluster-light light-gold" /><div className="cluster-light light-blue" />
      <svg className="flow-layer" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id={trail} x1="0" x2="1"><stop stopColor="#7e93be" stopOpacity=".15" /><stop offset=".45" stopColor="#8eabe4" stopOpacity=".7" /><stop offset="1" stopColor="#97d5c5" stopOpacity=".5" /></linearGradient></defs>
        <g className="flow-paths" ref={flows} /><g className="orbit-paths" ref={orbits} />
      </svg>
      <canvas ref={canvas} aria-hidden="true" hidden={state.fallback} />
      <svg ref={fallback} className="fallback" viewBox="0 0 1000 650" preserveAspectRatio="none" role="img" aria-label="Four luminous illustrative customer groups connected by flowing paths" aria-hidden={!state.fallback} style={{display:state.fallback?undefined:'none'}} />
      <div className="source-label" aria-hidden="true"><span />Individual purchase patterns</div>
      <div className="cluster-labels" role="group" aria-label="Explore example segments">
        {groups.map((group,index) => <button key={group.tone} type="button" className={`cluster-label label-${group.tone}`} aria-pressed={selected===index}
          onPointerEnter={()=>setHovered(index)} onPointerLeave={()=>setHovered(-1)} onFocus={()=>setHovered(index)} onBlur={()=>setHovered(-1)}
          onClick={()=>setSelected(value=>value===index?-1:index)}>
          <i aria-hidden="true" /><span><strong>{group.name}</strong><small>{group.detail}</small></span><b aria-hidden="true">↗</b>
        </button>)}
      </div>
    </div>
    <div className="hero-bottom"><p><i aria-hidden="true" />Illustrative customer segmentation <span>· Generated design example</span></p>
      <div className="scene-controls">
        <button type="button" aria-pressed={state.fallback} onClick={()=>controller.current?.toggleView()}>{state.fallback?'Try 3D view':'2D view'}</button>
        <button type="button" aria-pressed={state.paused} disabled={state.reduced||state.fallback} onClick={()=>controller.current?.toggleMotion()}>{state.reduced?'Reduced motion':state.paused?'Resume motion':'Pause motion'}</button>
      </div>
    </div>
    <p className="sr-only" aria-live="polite">{selected<0?'Select a group to explore its illustrative purchase pattern.':`${groups[selected].name}: ${groups[selected].detail}. Generated example, not real analysis.`}</p>
  </>;
}
