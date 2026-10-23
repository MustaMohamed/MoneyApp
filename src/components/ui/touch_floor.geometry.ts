import { type Insets, PixelRatio } from 'react-native';

import {
  type TouchFloorHitSlop,
  type TouchFloorRoom,
  touchFloorHitSlop,
  touchFloorHitSlopWithin,
} from '@/constants/theme';

/** A control centred in a row: its floor slop held inside the row's empty space plus `room` past the row, the floor slop beside it; `undefined` is a row not yet laid out. */
export function touchFloorHitSlopCentred(
  track: number,
  rowHeight: number | undefined,
  room: TouchFloorRoom,
): Required<Insets> {
  const inset = rowHeight === undefined ? 0 : Math.max(0, (rowHeight - track) / 2);
  const vertical = touchFloorHitSlopWithin(track, {
    top: room.top === undefined ? undefined : inset + room.top,
    bottom: room.bottom === undefined ? undefined : inset + room.bottom,
  });
  const side = touchFloorHitSlop(track).top;
  return { ...vertical, left: side, right: side };
}

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
