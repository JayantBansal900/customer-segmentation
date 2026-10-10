// The same cluster ID uses the same color in profiles, tables and projections.
// Colors repeat after eight IDs; labels remain authoritative.
export const CLUSTER_COLORS = ['#66dccb', '#f19781', '#e7cca0', '#99bcef', '#a4c697', '#c1a9de', '#e6a9c5', '#92c7dd'];
export const clusterColor = (id: number) => CLUSTER_COLORS[((id % CLUSTER_COLORS.length) + CLUSTER_COLORS.length) % CLUSTER_COLORS.length];
