import { useCallback, useState } from 'react';
import type { Insets, LayoutChangeEvent } from 'react-native';

import {
  type GridItemBox,
  type GridRows,
  resolveGridItemHitSlop,
} from '@/components/ui/touch_floor.geometry';
import type { TouchFloorHitSlop, TouchFloorRoom } from '@/constants/theme';

export interface TouchFloorGridItem {
  hitSlop: Required<Insets>;
  onLayout: (event: LayoutChangeEvent) => void;
}

export interface TouchFloorGridHitSlop {
  item: (key: string) => TouchFloorGridItem;
}

type MeasuredBoxes = Readonly<Record<string, GridItemBox>>;

function resolveGridRows(boxes: MeasuredBoxes): GridRows | undefined {
  const ys = Object.values(boxes).map((box) => box.y);
  if (ys.length === 0) return undefined;
  return { minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Each list item's touch-floor slop from its measured box, since Android scales an OS-scaled label's line nonlinearly. */
export function useTouchFloorGridHitSlop(
  gap: number,
  edge: TouchFloorRoom,
  minSlop?: TouchFloorHitSlop,
): TouchFloorGridHitSlop {
  const [boxes, setBoxes] = useState<MeasuredBoxes>({});
  const rows = resolveGridRows(boxes);

  const measure = useCallback((key: string, event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setBoxes((previous) =>
      key in previous && previous[key].y === y && previous[key].height === height
        ? previous
        : { ...previous, [key]: { y, height } },
    );
  }, []);

  return {
    item: (key: string) => ({
      hitSlop: resolveGridItemHitSlop(
        key in boxes ? boxes[key] : undefined,
        rows,
        gap,
        edge,
        minSlop,
      ),
      onLayout: (event: LayoutChangeEvent) => measure(key, event),
    }),
  };
}
