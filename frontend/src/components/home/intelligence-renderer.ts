import { colors, points, type Layout } from './intelligence-data';
const vertex = `
precision mediump float;
attribute vec3 local;
attribute float group;
attribute vec3 tint;
attribute float brightness;
attribute float size;
uniform vec2 resolution;
uniform vec2 centers[5];
uniform float scale;
uniform float time;
uniform float motion;
uniform float selected;
uniform float halo;
uniform float dpr;
varying vec4 color;
void main(){
  vec2 anchor=centers[0];
  if(group>.5)anchor=centers[1];if(group>1.5)anchor=centers[2];if(group>2.5)anchor=centers[3];if(group>3.5)anchor=centers[4];
  float angle=sin(time*.00007+group)*.09*motion;
  vec3 p=vec3(local.x*cos(angle)+local.z*sin(angle),local.y,-local.x*sin(angle)+local.z*cos(angle));
  p.x+=sin(time*.0006+local.y*.09+group)*.8*motion;
  p.y+=cos(time*.0005+local.x*.08+group)*.65*motion;
  float depth=600./(600.-p.z);
  vec2 projected=anchor*resolution+p.xy*scale*depth;
  projected.y+=sin(time*.00018+group)*2.5*motion*scale;
  gl_Position=vec4(projected.x/resolution.x*2.-1.,1.-projected.y/resolution.y*2.,0.,1.);
  gl_PointSize=max(1.1, size*dpr*depth*2.25)*(halo>.5?3.5:1.);
  float emphasis=selected<-.5||abs(group-selected)<.1||group>3.5?1.:.12;
  float light=brightness*(.72+.5*(p.z+100.)/200.);
  float alpha=emphasis*light*(group>3.5?.54:1.02)*(halo>.5?.17:1.);
  vec3 litTint=mix(tint,tint*.86,clamp(-p.z/160.,0.,.4));
  color=vec4(litTint,alpha);
}`;
const fragment = `precision mediump float;varying vec4 color;uniform float halo;
void main(){float radius=length(gl_PointCoord-vec2(.5));if(radius>.5)discard;float soft=1.-smoothstep(halo>.5?0.:.17,.5,radius);gl_FragColor=vec4(color.rgb,color.a*soft);}`;
export interface IntelligenceRenderer { dispose(): void; resize(): void; draw(time: number, motion: boolean, active: number, layout: Layout): void }
export function createIntelligenceRenderer(canvas: HTMLCanvasElement, scene: HTMLElement): IntelligenceRenderer | null {
  let gl: WebGLRenderingContext | null;
  try { gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power'}); } catch { return null; }
  if(!gl)return null;
  const shaders: WebGLShader[] = [], buffers: WebGLBuffer[] = []; let program: WebGLProgram | null = null;
  const dispose=()=>{buffers.forEach(buffer=>gl.deleteBuffer(buffer));shaders.forEach(shader=>gl.deleteShader(shader));if(program)gl.deleteProgram(program);};
  try {
    for(const [type,source] of ([[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]] as const)) {
      const shader=gl.createShader(type);if(!shader)throw Error('Shader unavailable');shaders.push(shader);
      gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Shader unavailable');
    }
    program=gl.createProgram();if(!program)throw Error('Program unavailable');shaders.forEach(shader=>gl.attachShader(program!,shader));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Program unavailable');gl.useProgram(program);
    const data: number[] = [];
    points.forEach(point=>{const rgb=[1,3,5].map(i=>parseInt(colors[point.group].slice(i,i+2),16)/255);data.push(point.x,point.y,point.z,point.group,...rgb,point.brightness,point.size);});
    const buffer=gl.createBuffer();if(!buffer)throw Error('Buffer unavailable');buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    for(const [name,size,offset] of ([['local',3,0],['group',1,3],['tint',3,4],['brightness',1,7],['size',1,8]] as const)){const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,36,offset*4);}
    const uniforms=Object.fromEntries(['resolution','centers','scale','time','motion','selected','halo','dpr'].map(name=>[name,gl.getUniformLocation(program!,name)]));
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.clearColor(0,0,0,0);
    return {dispose, draw(time, motion, active, layout){
      gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform2fv(uniforms.centers,new Float32Array(layout.flat()));
      const dpr=Math.min(devicePixelRatio||1,1.5);
      const scale=scene.clientWidth<760?Math.min(canvas.width/480,canvas.height/550):Math.min(canvas.width/1300,canvas.height/740);
      gl.uniform1f(uniforms.scale,scale);gl.uniform1f(uniforms.dpr,dpr);gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.motion,motion?1:0);gl.uniform1f(uniforms.selected,active);
      for(const halo of [1,0]){gl.uniform1f(uniforms.halo,halo);if(scene.clientWidth<760){for(let group=0;group<5;group++)gl.drawArrays(gl.POINTS,group*1800,group===4?1000:900);}else gl.drawArrays(gl.POINTS,0,points.length);}
    }, resize(){const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(scene.clientWidth*dpr);canvas.height=Math.round(scene.clientHeight*dpr);gl.viewport(0,0,canvas.width,canvas.height);}};
  }catch{dispose();return null;}
}
