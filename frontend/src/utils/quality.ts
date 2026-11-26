/** Plain-language reading of a silhouette score (range −1 to 1). */
export function separationLabel(score: number): string {
  if (score >= 0.5) return 'clearly separated';
  if (score >= 0.25) return 'some overlap';
  return 'weak separation';
}
