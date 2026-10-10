import { CLUSTERS, EXAMPLE_POINTS } from './cluster-scene';

const VERTEX = `
attribute vec3 position;
attribute vec3 color;
attribute float group;
uniform float angle;
uniform float selected;
uniform float density;
uniform float pixelSize;
varying vec4 tint;
void main() {
  float c = cos(angle), s = sin(angle);
  vec3 p = vec3(position.x*c + position.z*s, position.y, -position.x*s + position.z*c);
  float depth = 5.5/(5.5-p.z);
  gl_Position = vec4(p.x*.43*depth, p.y*1.055*depth, 0., 1.);
  float active = selected < -.5 ? 1. : 1.-min(abs(group-selected),1.);
  gl_PointSize = pixelSize*depth*(1.+active*.28);
  tint = vec4(color, mix(.14,.88,active)*density);
}`;
const FRAGMENT = `
precision mediump float;
varying vec4 tint;
void main() {
  float distance = length(gl_PointCoord-vec2(.5));
  if (distance > .5) discard;
  float edge = 1.-smoothstep(.26,.5,distance);
  gl_FragColor = vec4(tint.rgb,tint.a*edge);
}`;

export interface PointRenderer {
  draw: (angle: number, selected: number, narrow: boolean) => void;
  resize: () => void;
  dispose: () => void;
}

export function createPointRenderer(canvas: HTMLCanvasElement): PointRenderer | null {
  let gl: WebGLRenderingContext | null;
  try { gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' }); }
  catch { return null; }
  if (!gl) return null;
  const context = gl;
  const shaders: WebGLShader[] = [];
  const buffers: WebGLBuffer[] = [];
  let program: WebGLProgram | null = null;
  const dispose = () => {
    buffers.forEach(buffer => context.deleteBuffer(buffer));
    shaders.forEach(shader => context.deleteShader(shader));
    if (program) context.deleteProgram(program);
  };
  try {
    for (const [kind, source] of [[context.VERTEX_SHADER, VERTEX], [context.FRAGMENT_SHADER, FRAGMENT]] as const) {
      const shader = context.createShader(kind);
      if (!shader) throw new Error('Shader unavailable');
      shaders.push(shader); context.shaderSource(shader, source); context.compileShader(shader);
      if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) throw new Error('Shader unavailable');
    }
    program = context.createProgram();
    if (!program) throw new Error('Renderer unavailable');
    shaders.forEach(shader => context.attachShader(program!, shader));
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) throw new Error('Renderer unavailable');
    context.useProgram(program);
    function attribute(name: string, size: number, values: number[]) {
      const buffer = context.createBuffer();
      if (!buffer) throw new Error('Buffer unavailable');
      buffers.push(buffer); context.bindBuffer(context.ARRAY_BUFFER, buffer);
      context.bufferData(context.ARRAY_BUFFER, new Float32Array(values), context.STATIC_DRAW);
      const location = context.getAttribLocation(program!, name);
      context.enableVertexAttribArray(location); context.vertexAttribPointer(location, size, context.FLOAT, false, 0, 0);
    }
    attribute('position', 3, EXAMPLE_POINTS.flatMap(point => [point.x, point.y, point.z]));
    attribute('group', 1, EXAMPLE_POINTS.map(point => point.group));
    attribute('color', 3, EXAMPLE_POINTS.flatMap(point => {
      const hex = CLUSTERS[point.group].color;
      return [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255);
    }));
    const angle = context.getUniformLocation(program, 'angle');
    const selected = context.getUniformLocation(program, 'selected');
    const density = context.getUniformLocation(program, 'density');
    const pixelSize = context.getUniformLocation(program, 'pixelSize');
    context.enable(context.BLEND); context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
    context.clearColor(0, 0, 0, 0);
    return {
      resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        context.viewport(0, 0, canvas.width, canvas.height);
      },
      draw(rotation, selection, narrow) {
        context.clear(context.COLOR_BUFFER_BIT);
        context.uniform1f(angle, rotation); context.uniform1f(selected, selection);
        context.uniform1f(density, 1); context.uniform1f(pixelSize, Math.max(3, canvas.height * .012));
        // Mobile retains every group with half as many points per group.
        if (narrow) {
          for (let group = 0; group < 4; group++) context.drawArrays(context.POINTS, group * 240, 120);
        } else context.drawArrays(context.POINTS, 0, EXAMPLE_POINTS.length);
      },
      dispose,
    };
  } catch { dispose(); return null; }
}
