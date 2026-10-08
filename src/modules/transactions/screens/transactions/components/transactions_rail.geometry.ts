import type { MonthRowHitSlop } from '@/components/ui/month_filter.geometry';
import { TABS_LIST_PADDING, type TabsTriggerHitSlop } from '@/components/ui/tabs.geometry';
import { Size, Spacing, TOUCH_SLOP_PIXEL_MARGIN, TouchSize } from '@/constants/theme';

// Raw dp: `ms(8)` is 7 on a narrow phone, and three 7s leave the block short of two touch floors.
const RAIL_SPACE_FLOOR = 8;

export interface TransactionsRailGeometry {
  /** Above the month row, between the two rows and under the tab track. */
  space: number;
  monthRowHitSlop: MonthRowHitSlop;
  tabsHitSlop: TabsTriggerHitSlop;
}

/** The gap between the rows splits at its middle. */
export function resolveTransactionsRailGeometry(scaledSpace: number): TransactionsRailGeometry {
  const space = Math.max(scaledSpace, RAIL_SPACE_FLOOR);
  const tabsSlopTop = TABS_LIST_PADDING + space / 2;
  return {
    space,
    monthRowHitSlop: {
      top: space + TOUCH_SLOP_PIXEL_MARGIN,
      bottom: space / 2 + TOUCH_SLOP_PIXEL_MARGIN,
    },
    tabsHitSlop: {
      top: tabsSlopTop,
      bottom: TouchSize.min - Size.compactSegmentTrack - tabsSlopTop + TOUCH_SLOP_PIXEL_MARGIN,
    },
  };
}

export const TRANSACTIONS_RAIL = resolveTransactionsRailGeometry(Spacing.xs);

export const TRANSACTIONS_RAIL_STYLE = {
  paddingTop: TRANSACTIONS_RAIL.space,
  paddingBottom: TRANSACTIONS_RAIL.space,
} as const;
// A margin, never a `gap` on the rail: Yoga would count a gap twice around `MonthFilter`'s in-flow sheet root.
export const TRANSACTIONS_RAIL_TABS_STYLE = { marginTop: TRANSACTIONS_RAIL.space } as const;
