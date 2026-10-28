import type { MonthRowHitSlop } from '@/components/ui/month_filter.geometry';
import { TABS_LIST_PADDING, type TabsTriggerHitSlop } from '@/components/ui/tabs.geometry';
import { Size, Spacing, touchFloorHitSlopWithin } from '@/constants/theme';

// Raw dp: `ms(8)` is 7 on a narrow phone, and three 7s leave the block short of two touch floors.
const RAIL_SPACE_FLOOR = 8;

export interface ListRailGeometry {
  /** Above the month row, between the two rows and under the tab track. */
  space: number;
  monthRowHitSlop: MonthRowHitSlop;
  tabsHitSlop: TabsTriggerHitSlop;
}

/** The gap between the rows splits at its middle. */
export function resolveListRailGeometry(scaledSpace: number): ListRailGeometry {
  const space = Math.max(scaledSpace, RAIL_SPACE_FLOOR);
  return {
    space,
    monthRowHitSlop: touchFloorHitSlopWithin(Size.monthPillTrack, { bottom: space / 2 }),
    tabsHitSlop: touchFloorHitSlopWithin(Size.compactSegmentTrack, {
      top: TABS_LIST_PADDING + space / 2,
    }),
  };
}

export const LIST_RAIL = resolveListRailGeometry(Spacing.xs);

export const LIST_RAIL_STYLE = {
  paddingTop: LIST_RAIL.space,
  paddingBottom: LIST_RAIL.space,
} as const;
// A margin, never a `gap` on the rail: Yoga would count a gap twice around `MonthFilter`'s in-flow sheet root.
export const LIST_RAIL_TABS_STYLE = { marginTop: LIST_RAIL.space } as const;
