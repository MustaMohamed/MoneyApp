import { type Insets, PixelRatio } from 'react-native';

import {
  type TouchFloorHitSlop,
  type TouchFloorRoom,
  touchFloorHitSlopWithin,
} from '@/constants/theme';

/** An item's measured top and height, relative to its list's own view. */
export interface GridItemBox {
  y: number;
  height: number;
}

/** The top of the list's first and last measured rows. */
export interface GridRows {
  minY: number;
  maxY: number;
}

/** A list item's slop: half the gap toward an inner neighbour, the list's edge room on its outer rows, never past a room. */
export function resolveGridItemHitSlop(
  box: GridItemBox | undefined,
  rows: GridRows | undefined,
  gap: number,
  edge: TouchFloorRoom,
  minSlop?: TouchFloorHitSlop,
): Required<Insets> {
  const half = gap / 2;
  if (box === undefined || rows === undefined) {
    return { top: half, bottom: half, left: half, right: half };
  }
  const pixel = 1 / PixelRatio.get();
  const isTopRow = Math.abs(box.y - rows.minY) <= pixel;
  const isBottomRow = Math.abs(box.y - rows.maxY) <= pixel;
  const within = touchFloorHitSlopWithin(box.height, {
    top: isTopRow ? edge.top : half,
    bottom: isBottomRow ? edge.bottom : half,
  });
  return {
    top: isTopRow ? resolveEdgeSide(edge.top, within.top, minSlop?.top) : half,
    bottom: isBottomRow ? resolveEdgeSide(edge.bottom, within.bottom, minSlop?.bottom) : half,
    left: half,
    right: half,
  };
}

function resolveEdgeSide(room: number | undefined, within: number, minSlop = 0): number {
  return Math.min(room ?? Infinity, Math.max(within, minSlop));
}
