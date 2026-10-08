import { TABS_LIST_PADDING, type TabsTriggerHitSlop } from '@/components/ui/tabs.geometry';
import { Size, Spacing, TouchSize } from '@/constants/theme';

// Raw dp: `ms(8)` is 7 on a narrow phone, and three 7s leave the block short of two touch floors.
const RAIL_SPACE_FLOOR = 8;

export interface TransactionsRailGeometry {
  /** Above the month row, between the two rows and under the tab track. */
  space: number;
  monthRowHitSlop: { top: number; bottom: number };
  tabsHitSlop: TabsTriggerHitSlop;
}

/** The gap between the rows splits at its middle; each `Spacing.xxxxs` covers Android's dp-to-px truncation of a slop. */
export function resolveTransactionsRailGeometry(scaledSpace: number): TransactionsRailGeometry {
  const space = Math.max(scaledSpace, RAIL_SPACE_FLOOR);
  const tabsSlopTop = TABS_LIST_PADDING + space / 2;
  return {
    space,
    monthRowHitSlop: { top: space + Spacing.xxxxs, bottom: space / 2 + Spacing.xxxxs },
    tabsHitSlop: {
      top: tabsSlopTop,
      bottom: TouchSize.min - Size.compactSegmentTrack - tabsSlopTop + Spacing.xxxxs,
    },
  };
}

export const TRANSACTIONS_RAIL = resolveTransactionsRailGeometry(Spacing.xs);
