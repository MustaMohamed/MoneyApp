export interface VisibleScrollOffsetParams {
  currentOffset: number;
  viewportWidth: number;
  itemX: number;
  itemWidth: number;
  /** The scroll content's full width; absent, no content is taken to fit and the offset has no upper clamp. */
  contentWidth?: number;
}

/** The scroll offset that brings a cut item whole into view, or `undefined` when nothing has to move. */
export function getVisibleScrollOffset({
  currentOffset,
  viewportWidth,
  itemX,
  itemWidth,
  contentWidth,
}: VisibleScrollOffsetParams): number | undefined {
  if (viewportWidth <= 0 || itemWidth <= 0) return undefined;
  if (contentWidth !== undefined && contentWidth <= viewportWidth) return undefined;

  const itemStart = itemX;
  const itemEnd = itemX + itemWidth;
  const visibleStart = currentOffset;
  const visibleEnd = currentOffset + viewportWidth;

  if (itemStart >= visibleStart && itemEnd <= visibleEnd) return undefined;

  const flooredOffset = Math.max(0, itemStart < visibleStart ? itemStart : itemEnd - viewportWidth);
  if (contentWidth === undefined) return flooredOffset;

  return Math.min(flooredOffset, Math.max(0, contentWidth - viewportWidth));
}
