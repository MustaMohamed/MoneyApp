import type { Insets } from 'react-native';

import { getVisibleScrollOffset } from '@/components/ui/scroll_reveal.geometry';
import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
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

/** The amount's error line is as thick as the stroke of the ring the fact rows and the strip keep. */
export const AMOUNT_ERROR_LINE_HEIGHT = Size.hairline;

/** The line lies along the input's bottom edge and outside its layout, so nothing moves between valid and invalid. */
export const AMOUNT_ERROR_LINE_STYLE = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
} as const;

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

interface AccountStripRevealInput {
  /** The chip's position in the strip, from 0. */
  index: number;
  /** The strip scroll's laid-out width; 0 before its first layout. */
  viewportWidth: number;
  scrollX: number;
}

/** The scroll offset that shows a chip whole: `scrollX` itself when the chip already lies whole in view. The content has no side padding, so no margin. */
export function resolveAccountStripRevealX({
  index,
  viewportWidth,
  scrollX,
}: AccountStripRevealInput): number {
  const revealX = getVisibleScrollOffset({
    currentOffset: scrollX,
    viewportWidth,
    itemX: index * (ACCOUNT_STRIP_CHIP_WIDTH + ACCOUNT_STRIP_GAP),
    itemWidth: ACCOUNT_STRIP_CHIP_WIDTH,
  });
  return revealX ?? scrollX;
}

export const TRANSACTION_FORM_CONTENT_CONTAINER_STYLE = {
  padding: Spacing.md,
  gap: Spacing.xs,
};

export const TRANSACTION_FORM_SKELETON_GEOMETRY = {
  tabBar: ms(36),
  // Raw px: ms() would move the bar's 1.0 height.
  supportingBar: 12,
  amount: ms(40),
  stripBar: { width: ACCOUNT_STRIP_CHIP_WIDTH, height: ACCOUNT_STRIP_CHIP_HEIGHT },
  stripBarCount: 3,
  factRow: FACT_ROW_MIN_HEIGHT,
  factRowCount: 4,
  keyBar: { width: ms(60), height: lineHeightFor(Type.body) },
  valueBar: { width: ms(100), height: lineHeightFor(Type.body) },
} as const;

interface SkeletonBarBox {
  width: number;
  height: number;
}

/** The sheet skeleton's text bars at the OS font scale; widths stay. */
export function resolveTransactionFormSkeletonBars(fontScale: number): {
  supportingBar: number;
  amount: number;
  keyBar: SkeletonBarBox;
  valueBar: SkeletonBarBox;
} {
  const { supportingBar, amount, keyBar, valueBar } = TRANSACTION_FORM_SKELETON_GEOMETRY;
  return {
    supportingBar: resolveSkeletonBarHeight(supportingBar, fontScale),
    amount: resolveSkeletonBarHeight(amount, fontScale),
    keyBar: { width: keyBar.width, height: resolveSkeletonBarHeight(keyBar.height, fontScale) },
    valueBar: {
      width: valueBar.width,
      height: resolveSkeletonBarHeight(valueBar.height, fontScale),
    },
  };
}

export function resolveTypeTabsGeometry(fontScale: number): {
  listHeight: number;
  skeletonHeight: number;
} {
  const listHeight = Math.max(
    Size.typeTabsTrack,
    resolveSegmentedTabsGeometry(fontScale).compact.listHeight,
  );
  return {
    listHeight,
    skeletonHeight: fontScale <= 1 ? TRANSACTION_FORM_SKELETON_GEOMETRY.tabBar : listHeight,
  };
}
