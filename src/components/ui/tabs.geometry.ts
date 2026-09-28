import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

// `.tabs__list--variant-primary`'s own padding, unscaled CSS.
export const TABS_LIST_PADDING = 3;
// The compact trigger's `h-7` at scale 1.
const COMPACT_TRIGGER_MIN_HEIGHT = 28;

export interface SegmentedTabsLabelStyle {
  fontSize: number;
  lineHeight: number;
}

export interface SegmentedTabsGeometry {
  compact: { label: SegmentedTabsLabelStyle; triggerHeight: number; listHeight: number };
  /** `undefined` at or below scale 1: the default label keeps HeroUI's own size and the OS scales it. */
  defaultLabel: SegmentedTabsLabelStyle | undefined;
}

export function resolveSegmentedTabsGeometry(fontScale: number): SegmentedTabsGeometry {
  const compactFontSize = scaledFontSize(Type.micro, fontScale);
  const compactLabel = { fontSize: compactFontSize, lineHeight: lineHeightFor(compactFontSize) };
  const triggerHeight = Math.max(
    COMPACT_TRIGGER_MIN_HEIGHT,
    compactLabel.lineHeight + 2 * Spacing.xxxs,
  );
  const defaultFontSize = scaledFontSize(Type.subhead, fontScale);
  return {
    compact: {
      label: compactLabel,
      triggerHeight,
      listHeight: triggerHeight + 2 * TABS_LIST_PADDING,
    },
    defaultLabel:
      fontScale <= 1
        ? undefined
        : { fontSize: defaultFontSize, lineHeight: lineHeightFor(defaultFontSize) },
  };
}
