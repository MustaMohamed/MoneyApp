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
