import {
  type ScaledTextStyle,
  scaledTextStyle,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type } from '@/constants/theme';

// `.tabs__list--variant-primary`'s own padding, unscaled CSS.
export const TABS_LIST_PADDING = 3;

export interface SegmentedTabsGeometry {
  compact: { label: ScaledTextStyle; triggerHeight: number; listHeight: number };
  /** `undefined` at or below scale 1: the default label keeps HeroUI's own size and the OS scales it. */
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
    defaultLabel: scaledTextStyleAboveOne(Type.subhead, fontScale),
  };
}
