import { resolveFactRowHeight } from '@/components/ui/fact_row.geometry';
import {
  ACCOUNT_STRIP_CHIP_HEIGHT,
  ACCOUNT_STRIP_CHIP_WIDTH,
  AMOUNT_ENTRY_MAX_FONT_SCALE,
  resolveAccountStripChipGeometry,
} from '@/components/ui/form_sheet.geometry';
import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import {
  type TabsTriggerHitSlop,
  resolveSegmentedTabsGeometry,
} from '@/components/ui/tabs.geometry';
import { type ScaledTextStyle, scaledTextStyleAboveOne } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type, lineHeightFor, touchFloorHitSlop } from '@/constants/theme';
import { ms } from '@/utils/responsive';

/** The gap between the status track and Save. */
export const TRANSACTION_FORM_STATUS_GAP = Spacing.xs;

/** Above scale 1 the app scales the Note's text: Android draws the hint without the line box, and an OS-scaled line box is shorter than the hint's own lines; the floor is the shared fact row's height. */
export function resolveNoteInputGeometry(fontScale: number): {
  minHeight: number;
  text: ScaledTextStyle | undefined;
} {
  const text = scaledTextStyleAboveOne(Type.body, fontScale);
  return { minHeight: resolveFactRowHeight(fontScale), text };
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

/** `triggerHitSlop` lifts a tab past the touch floor. */
export function resolveTypeTabsGeometry(fontScale: number): {
  listHeight: number;
  skeletonHeight: number;
  triggerHitSlop: TabsTriggerHitSlop;
} {
  const { compact } = resolveSegmentedTabsGeometry(fontScale);
  const listHeight = Math.max(Size.typeTabsTrack, compact.listHeight);
  return {
    listHeight,
    skeletonHeight: fontScale <= 1 ? TRANSACTION_FORM_SKELETON_GEOMETRY.tabBar : listHeight,
    triggerHitSlop: touchFloorHitSlop(compact.triggerHeight),
  };
}
