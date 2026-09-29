/** A skeleton bar standing for text, a button, a chip or a pill grows with the OS font scale, as its loaded box does. */
export function resolveSkeletonBarHeight(height: number, fontScale: number): number {
  return height * fontScale;
}
