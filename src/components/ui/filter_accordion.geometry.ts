import type { ViewStyle } from 'react-native';

import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export const FILTER_AMOUNT_FIELD_SLOT_HEIGHT = ms(76);
export const FILTER_AMOUNT_ERROR_SLOT_HEIGHT = ms(16);

/** At or below scale 1 the two slots are fixed; above it each height is a floor, so a slot is as tall as the message it holds. */
export function resolveFilterAmountSlotStyle(fontScale: number): {
  field: ViewStyle;
  range: ViewStyle;
} {
  if (fontScale <= 1) {
    return {
      field: { height: FILTER_AMOUNT_FIELD_SLOT_HEIGHT },
      range: { height: FILTER_AMOUNT_ERROR_SLOT_HEIGHT },
    };
  }
  return {
    field: { minHeight: FILTER_AMOUNT_FIELD_SLOT_HEIGHT },
    range: { minHeight: lineHeightFor(scaledFontSize(Type.micro, fontScale)) },
  };
}

// `FilterAccordionShell`'s card padding, `p-3.5` in unscaled CSS px.
export const FILTER_ACCORDION_PADDING = 14;

// The gap between a section's title row and its body, `mt-3` in unscaled CSS px.
export const FILTER_ACCORDION_BODY_GAP = 12;

// `FilterOptionPillList`'s `gap-1.5`, unscaled CSS px.
export const FILTER_OPTION_PILL_GAP = 6;

/** Each pill takes the row gap under it; a slop past it, or above the pill, would take a tap on a neighbouring pill. */
export const FILTER_OPTION_PILL_HIT_SLOP = Object.freeze({
  top: 0,
  bottom: FILTER_OPTION_PILL_GAP,
});
