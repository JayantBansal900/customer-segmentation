// Synthetic presentation data only. No API results or clustering calculations.
export const CLUSTERS = [
  { name: 'Frequent visitors', color: '#B7CDBE', center: [-1.55, -.12, -.2], description: 'A group with a similar rhythm of repeat purchases.' },
  { name: 'Recent arrivals', color: '#F0A17F', center: [-.52, .42, .5], description: 'A group connected by more recent purchase activity.' },
  { name: 'Occasional buyers', color: '#A8BDD9', center: [.7, -.27, .1], description: 'A group with a more occasional purchasing rhythm.' },
  { name: 'High-value regulars', color: '#DBCC93', center: [1.65, .45, -.2], description: 'A group combining repeat purchases and higher purchase value.' },
] as const;

let seed = 48271;
function random() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
function gaussian() { let value = 0; for (let i = 0; i < 12; i++) value += random(); return value - 6; }
export const EXAMPLE_POINTS = CLUSTERS.flatMap((cluster, group) =>
  Array.from({ length: 240 }, () => ({
    x: cluster.center[0] + gaussian() * .22,
    y: cluster.center[1] + gaussian() * .17,
    z: cluster.center[2] + gaussian() * .24,
    group,
  })),
);

export function fallbackPosition(x: number, y: number, z: number) {
  const perspective = 5.5 / (5.5 - z);
  return { x: 500 + x * 215 * perspective, y: 180 - y * 190 * perspective };
}
