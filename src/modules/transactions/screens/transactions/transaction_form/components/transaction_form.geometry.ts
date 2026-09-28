import type { Insets } from 'react-native';

import { SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import {
  Radius,
  Size,
  Spacing,
  TouchSize,
  Type,
  lineHeightFor,
  touchFloorSlop,
} from '@/constants/theme';
import { ms } from '@/utils/responsive';

export const FACT_ROW_MIN_HEIGHT = TouchSize.min;

/** The gap between the status track and Save. */
export const TRANSACTION_FORM_STATUS_GAP = Spacing.xs;

/** The bare CTA's clearance plus the status track at its two-line cap and its gap above Save. */
export const TRANSACTION_FORM_FOOTER_CLEARANCE =
  SHEET_FOOTER_CLEARANCE + Size.statusTrack + TRANSACTION_FORM_STATUS_GAP;

/** D6: the sheet's 16 padding plus the hero's 16 margin, since the hero root spans the sheet width. */
export const AMOUNT_RING_INSET = Spacing.xxl;

/** The sheet frames' 118 by 40 row, ruled 2026-09-27 (MA-122) over the canvas base rule's 64-wide column. */
export const ACCOUNT_STRIP_CHIP_WIDTH = ms(118);
export const ACCOUNT_STRIP_CHIP_HEIGHT = ms(40);
export const ACCOUNT_STRIP_GAP = Spacing.xs;
export const ACCOUNT_STRIP_CHIP_RADIUS = Radius.md;
export const ACCOUNT_STRIP_TILE = Size.dualTile;
export const ACCOUNT_STRIP_CHIP_PADDING_X = ms(10);
export const ACCOUNT_STRIP_TILE_NAME_GAP = Spacing.xs;
export const ACCOUNT_STRIP_DIMMED_OPACITY = 0.6;
/** Lifts the 40-high chip past the touch floor, plus 1 so Android's dp-to-px truncation of the slop still clears 44. */
export const ACCOUNT_STRIP_CHIP_SLOP_Y = touchFloorSlop(ACCOUNT_STRIP_CHIP_HEIGHT) + Spacing.xxxxs;
/** Horizontally the slop stops at half the gap, so a neighbour keeps its side. */
export const ACCOUNT_STRIP_HIT_SLOP: Readonly<Insets> = Object.freeze({
  top: ACCOUNT_STRIP_CHIP_SLOP_Y,
  bottom: ACCOUNT_STRIP_CHIP_SLOP_Y,
  left: ACCOUNT_STRIP_GAP / 2,
  right: ACCOUNT_STRIP_GAP / 2,
});
export const ACCOUNT_STRIP_INSET_X = Spacing.md;
/** The strip row's padding above and below its chips; the scroll holds the slop, since Android drops a touch outside the ScrollView. */
export const ACCOUNT_STRIP_PADDING_Y = Math.max(Spacing.xxs, ACCOUNT_STRIP_CHIP_SLOP_Y);
export const ACCOUNT_STRIP_WRAPPER_PADDING_Y = ACCOUNT_STRIP_PADDING_Y - ACCOUNT_STRIP_CHIP_SLOP_Y;

export const TRANSACTION_FORM_CONTENT_CONTAINER_STYLE = {
  padding: Spacing.md,
  gap: Spacing.xs,
  paddingBottom: TRANSACTION_FORM_FOOTER_CLEARANCE,
};

export const TRANSACTION_FORM_SKELETON_GEOMETRY = {
  tabBar: ms(36),
  amount: ms(40),
  stripBar: { width: ACCOUNT_STRIP_CHIP_WIDTH, height: ACCOUNT_STRIP_CHIP_HEIGHT },
  stripBarCount: 3,
  factRow: FACT_ROW_MIN_HEIGHT,
  factRowCount: 4,
  keyBar: { width: ms(60), height: lineHeightFor(Type.body) },
  valueBar: { width: ms(100), height: lineHeightFor(Type.body) },
} as const;

// The type tab row's `h-9` at scale 1.
const TYPE_TABS_MIN_LIST_HEIGHT = 36;

/** The type tab row and its skeleton shape share one height at every font scale. */
export function resolveTypeTabsGeometry(fontScale: number): {
  listHeight: number;
  skeletonHeight: number;
} {
  const listHeight = Math.max(
    TYPE_TABS_MIN_LIST_HEIGHT,
    resolveSegmentedTabsGeometry(fontScale).compact.listHeight,
  );
  return {
    listHeight,
    skeletonHeight: Math.max(TRANSACTION_FORM_SKELETON_GEOMETRY.tabBar, listHeight),
  };
}
