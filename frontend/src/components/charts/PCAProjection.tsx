import { TechnicalDetails } from '../ui/TechnicalDetails';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Customer } from '../../types/analysis';
import { formatNumber } from '../../utils/format';
import { clusterColor } from '../../utils/cluster-colors';

export function PCAProjection({ customers }: { customers: Customer[] }) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const hitPoints=useRef<{customer:Customer;x:number;y:number}[]>([]);
  const [hidden,setHidden]=useState<number[]>([]);
  const [hovered,setHovered]=useState<Customer|null>(null);
  const [lookup,setLookup]=useState('');
  const available=useMemo(()=>customers.filter(c=>c.pc1!=null&&c.pc2!=null),[customers]);
  const clusters=useMemo(()=>[...new Set(available.map(c=>c.cluster_id))].sort((a,b)=>a-b),[available]);
  const bounds=useMemo(()=>{
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const c of available){minX=Math.min(minX,c.pc1!);maxX=Math.max(maxX,c.pc1!);minY=Math.min(minY,c.pc2!);maxY=Math.max(maxY,c.pc2!);}
    if(minX===maxX){minX-=.5;maxX+=.5;}if(minY===maxY){minY-=.5;maxY+=.5;}
    return {minX,maxX,minY,maxY};
  },[available]);
  const inspected=lookup ? available.find(c=>c.customer_id===lookup&&!hidden.includes(c.cluster_id)) ?? null : hovered;
  useEffect(()=>{
    const element=canvas.current;
    if(!element||!available.length) return;
    function draw(){
      const context=element!.getContext('2d');if(!context)return;
      const width=element!.clientWidth||900,height=element!.clientHeight||400,margin=width<500?54:60;
      const ratio=Math.min(window.devicePixelRatio||1,2);
      element!.width=Math.round(width*ratio);element!.height=Math.round(height*ratio);
      context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,width,height);
      const {minX,maxX,minY,maxY}=bounds;
      const x=(v:number)=>margin+(v-minX)/(maxX-minX)*(width-margin*2);
      const y=(v:number)=>height-margin-(v-minY)/(maxY-minY)*(height-margin*2);
      context.fillStyle='#0c171c';context.fillRect(0,0,width,height);context.font=getComputedStyle(element!).getPropertyValue('--type-chart').trim()+' Sora, sans-serif';
      for(let i=0;i<=4;i++){
        const vx=minX+(maxX-minX)*i/4,vy=minY+(maxY-minY)*i/4;
        context.strokeStyle='#93b7a521';context.beginPath();context.moveTo(x(vx),margin);context.lineTo(x(vx),height-margin);context.moveTo(margin,y(vy));context.lineTo(width-margin,y(vy));context.stroke();
        context.fillStyle='#b0c7b9';context.textAlign='center';context.fillText(formatNumber(vx),x(vx),height-margin+19);context.textAlign='right';context.fillText(formatNumber(vy),margin-7,y(vy)+4);
      }
      context.textAlign='center';context.fillText('PC1',width/2,height-8);context.save();context.translate(12,height/2);context.rotate(-Math.PI/2);context.fillText('PC2',0,0);context.restore();
      hitPoints.current=[];context.globalAlpha=.72;
      for(const customer of available){if(hidden.includes(customer.cluster_id))continue;const px=x(customer.pc1!),py=y(customer.pc2!);context.fillStyle=clusterColor(customer.cluster_id);context.beginPath();context.arc(px,py,2.6,0,Math.PI*2);context.fill();hitPoints.current.push({customer,x:px,y:py});}
      context.globalAlpha=1;
      if(inspected){context.strokeStyle='#edf5ed';context.lineWidth=1.5;context.beginPath();context.arc(x(inspected.pc1!),y(inspected.pc2!),6,0,Math.PI*2);context.stroke();}
    }
    draw();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(draw);observer?.observe(element);
    window.addEventListener('resize',draw);document.fonts?.ready.then(()=>{if(element.isConnected)draw();});
    return()=>{observer?.disconnect();window.removeEventListener('resize',draw);hitPoints.current=[];};
  },[available,bounds,hidden,inspected]);
  return <figure className="panel pca-panel"><figcaption>Two-dimensional PCA projection</figcaption><p className="help">Explore customer patterns in two dimensions.</p>
    {available.length ? <><div className="pca-stage"><canvas ref={canvas} width={900} height={400} className="pca-canvas" role="img" aria-label={`PCA projection of ${available.length} customers, colored by cluster. Exact PC coordinates are included in customer CSV exports.`}
      onPointerMove={event=>{const rect=event.currentTarget.getBoundingClientRect(),px=event.clientX-rect.left,py=event.clientY-rect.top;let closest:null|Customer=null,distance=144;for(const p of hitPoints.current){const d=(p.x-px)**2+(p.y-py)**2;if(d<distance){distance=d;closest=p.customer;}}setHovered(closest);}}
      onPointerLeave={()=>setHovered(null)} /></div>
      <ul className="legend" aria-label="PCA cluster visibility">{clusters.map(cluster=><li key={cluster}><button type="button" aria-pressed={!hidden.includes(cluster)} onClick={()=>{setHidden(previous=>previous.includes(cluster)?previous.filter(id=>id!==cluster):[...previous,cluster]);setHovered(null);}}><span style={{backgroundColor:clusterColor(cluster)}} aria-hidden="true" />Cluster {cluster}</button></li>)}</ul>
      <label className="field pca-search">Inspect PCA customer ID<input value={lookup} placeholder="Exact Customer ID" onChange={e=>setLookup(e.target.value)} /></label>
      <div className="point-tooltip" role="status">{inspected ? <>Customer {inspected.customer_id} · Cluster {inspected.cluster_id}<br />PC1 {formatNumber(inspected.pc1)} · PC2 {formatNumber(inspected.pc2)}<br />R/F/M: {formatNumber(inspected.recency)} days · {formatNumber(inspected.frequency)} invoices · {formatNumber(inspected.monetary)} purchase value</> : lookup ? 'No visible customer has this exact ID. Check the ID or enable its cluster.' : 'Point details: hover or touch a plotted point, or enter an exact Customer ID.'}</div></> : <p>PCA coordinates are unavailable for this result.</p>}
    <p className="help">{formatNumber(available.length)} customers plotted; {formatNumber(customers.length-available.length)} have unavailable coordinates.</p><TechnicalDetails summary="How to read the PCA plot"><p>Toggle clusters with the legend. Colors repeat after eight clusters; labels identify each group.</p><p>PCA is a 2D view, not a prediction or the clustering input. Some distances are lost in the projection.</p></TechnicalDetails>
  </figure>;
}
