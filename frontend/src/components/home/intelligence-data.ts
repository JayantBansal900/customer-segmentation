// Deterministic illustrative geometry; independent of API results.
export const colors = ['#4fe0c6', '#fa8a66', '#f1c66f', '#88b7ff', '#c1d1dd'];
let seed = 92341;
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
export interface Point { x: number; y: number; z: number; group: number; brightness: number; size: number }
export const points: Point[] = [];
for (let group = 0; group < 5; group++) {
  const count = group === 4 ? 2100 : 1800;
  for (let i = 0; i < count; i++) {
    const theta = random() * Math.PI * 2;
    const cosPhi = random() * 2 - 1;
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
    const radius = i % 3 === 0 ? Math.cbrt(random()) * .88 : .69 + random() * .31;
    const irregular = 1 + .075 * Math.sin(theta * 4 + cosPhi * 8) + .045 * Math.cos(theta * 7);
    const x = Math.cos(theta) * sinPhi * radius * (group === 4 ? 105 : [84,77,87,79][group]) * irregular + (group === 4 ? Math.sin(cosPhi * 7) * 24 : 0);
    const y = cosPhi * radius * (group === 4 ? 175 : [76,82,74,78][group]) * irregular;
    const z = Math.sin(theta) * sinPhi * radius * (group === 4 ? 95 : [94,83,78,98][group]);
    const brightness = .36 + random() * .64;
    const size = random() < .14 ? 1.1 + random() * .4 : .65 + random() * .4;
    points.push({ x, y, z, group, brightness, size });
  }
}


export type Layout = [number, number][];
export function layoutFor(width: number): Layout {
  return width < 760 ? [[.31,.26],[.75,.40],[.75,.70],[.30,.73],[.12,.54]] : [[.61,.33],[.83,.25],[.85,.64],[.62,.75],[.38,.60]];
}
export const groups = [
  {name:'Loyal Customers', detail:'Repeat purchase patterns', tone:'teal'},
  {name:'New Customers', detail:'Recent purchase activity', tone:'coral'},
  {name:'Regular Customers', detail:'A familiar purchasing rhythm', tone:'gold'},
  {name:'Inactive Customers', detail:'A longer time since purchase', tone:'blue'},
] as const;
export function decorativePoints(width: number) {
  let previewSeed = seed;
  const sample = () => { previewSeed = (previewSeed * 16807) % 2147483647; return previewSeed / 2147483647; };
  // Match the two approved preview fields without mutable render-time randomness.
  if (width === 220) for (let i = 0; i < 300; i++) sample();
  return Array.from({length:100}, (_,i) => ({left:width*.18+(i%3)*width*.28+(sample()-.5)*width*.24, top:25+Math.sin(i%3)*10+(sample()-.5)*35, background:colors[i%3], opacity:.4+sample()*.5}));
}
