import {
  HEROUI_TEXT_TYPE,
  type ScaledTextStyle,
  scaledTextStyle,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type } from '@/constants/theme';

// `.tabs__list--variant-primary`'s own padding, unscaled CSS.
export const TABS_LIST_PADDING = 3;
// `.tabs__scroll-view-content-container--variant-primary`'s own `padding-inline`, unscaled CSS.
export const TABS_SCROLL_CONTENT_INSET = 1;

/** Dp past a trigger's top and bottom edges that still select it. */
export interface TabsTriggerHitSlop {
  top: number;
  bottom: number;
}

/** What a scrollable row's scroll box grows by to hold the slop: Android drops a touch outside a scroll view. */
export function resolveTabsScrollSlopInset(
  triggerHitSlop: TabsTriggerHitSlop | undefined,
): TabsTriggerHitSlop | undefined {
  if (triggerHitSlop === undefined) return undefined;
  return {
    top: Math.max(TABS_LIST_PADDING, triggerHitSlop.top),
    bottom: Math.max(TABS_LIST_PADDING, triggerHitSlop.bottom),
  };
}

export interface SegmentedTabsGeometry {
  compact: { label: ScaledTextStyle; triggerHeight: number; listHeight: number };
  defaultLabel: ScaledTextStyle | undefined;
}

export function resolveSegmentedTabsGeometry(fontScale: number): SegmentedTabsGeometry {
  const compactLabel = scaledTextStyle(Type.micro, fontScale);
  const triggerHeight = Math.max(
    Size.compactSegmentTrack,
    compactLabel.lineHeight + 2 * Spacing.xxxs,
  );
  return {
    compact: {
      label: compactLabel,
      triggerHeight,
      listHeight: triggerHeight + 2 * TABS_LIST_PADDING,
    },
    defaultLabel: scaledTextStyleAboveOne(HEROUI_TEXT_TYPE.base, fontScale),
  };
}
