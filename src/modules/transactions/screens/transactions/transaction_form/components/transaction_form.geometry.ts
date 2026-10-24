import { resolveFactRowHeight } from '@/components/ui/fact_row.geometry';
import {
  ACCOUNT_STRIP_CHIP_HEIGHT,
  ACCOUNT_STRIP_CHIP_WIDTH,
  AMOUNT_ENTRY_MAX_FONT_SCALE,
  resolveAccountStripChipGeometry,
  resolveTypeTabsGeometry,
} from '@/components/ui/form_sheet.geometry';
import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export const TRANSACTION_FORM_SKELETON_GEOMETRY = {
  tabBar: ms(36),
  // Raw px: ms() would move the bar's 1.0 height.
  supportingBar: 12,
  amount: ms(40),
  stripBar: { width: ACCOUNT_STRIP_CHIP_WIDTH, height: ACCOUNT_STRIP_CHIP_HEIGHT },
  stripBarCount: 3,
  factRowCount: 4,
  keyBar: { width: ms(60), height: lineHeightFor(Type.body) },
  valueBar: { width: ms(100), height: lineHeightFor(Type.body) },
} as const;

interface SkeletonBarBox {
  width: number;
  height: number;
}

/** The sheet skeleton's bars at the OS font scale: the amount bar stops with the amount, the strip bar is the chip's height, a fact row the shared row's; widths stay. */
export function resolveTransactionFormSkeletonBars(fontScale: number): {
  supportingBar: number;
  amount: number;
  stripBar: SkeletonBarBox;
  keyBar: SkeletonBarBox;
  valueBar: SkeletonBarBox;
  factRow: number;
} {
  const { supportingBar, amount, stripBar, keyBar, valueBar } = TRANSACTION_FORM_SKELETON_GEOMETRY;
  return {
    supportingBar: resolveSkeletonBarHeight(supportingBar, fontScale),
    amount: resolveSkeletonBarHeight(amount, fontScale, AMOUNT_ENTRY_MAX_FONT_SCALE),
    stripBar: { width: stripBar.width, height: resolveAccountStripChipGeometry(fontScale).height },
    keyBar: { width: keyBar.width, height: resolveSkeletonBarHeight(keyBar.height, fontScale) },
    valueBar: {
      width: valueBar.width,
      height: resolveSkeletonBarHeight(valueBar.height, fontScale),
    },
    factRow: resolveFactRowHeight(fontScale),
  };
}

/** The skeleton's tab shape: the skeleton bar at or below scale 1, the loaded tab row above it. */
export function resolveTypeTabsSkeletonHeight(fontScale: number): number {
  return fontScale <= 1
    ? TRANSACTION_FORM_SKELETON_GEOMETRY.tabBar
    : resolveTypeTabsGeometry(fontScale).listHeight;
}
