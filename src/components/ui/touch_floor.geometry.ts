import { type Insets, PixelRatio } from 'react-native';

import {
  type TouchFloorHitSlop,
  type TouchFloorRoom,
  touchFloorHitSlopInGap,
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
  if (box === undefined || rows === undefined) return touchFloorHitSlopInGap(0, gap);
  const half = gap / 2;
  const pixel = 1 / PixelRatio.get();
  const rooms: TouchFloorRoom = {
    top: Math.abs(box.y - rows.minY) <= pixel ? edge.top : half,
    bottom: Math.abs(box.y - rows.maxY) <= pixel ? edge.bottom : half,
  };
  const within = touchFloorHitSlopWithin(box.height, rooms);
  return {
    top: Math.min(rooms.top ?? Infinity, Math.max(within.top, minSlop?.top ?? 0)),
    bottom: Math.min(rooms.bottom ?? Infinity, Math.max(within.bottom, minSlop?.bottom ?? 0)),
    left: half,
    right: half,
  };
}
