import type { ViewStyle } from 'react-native';

import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { type TouchFloorRoom, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

// The filter card's `border`, `mb-2` and content `pb-3.5`, unscaled CSS px.
export const FILTER_ACCORDION_CARD_BORDER = 1;
export const FILTER_ACCORDION_CARD_MARGIN_BOTTOM = 8;
export const FILTER_ACCORDION_CONTENT_PADDING_BOTTOM = 14;

// The filter option list's `gap-1.5`, unscaled CSS px (frame B1FilterSheet `.facc .pl`).
export const FILTER_OPTION_PILL_GAP = 6;

/** No room above the top row, where the trigger draws over the content; half the gap to the next card's trigger below the bottom row. */
export const FILTER_OPTION_LIST_EDGE: TouchFloorRoom = {
  top: 0,
  bottom:
    (FILTER_ACCORDION_CONTENT_PADDING_BOTTOM +
      2 * FILTER_ACCORDION_CARD_BORDER +
      FILTER_ACCORDION_CARD_MARGIN_BOTTOM) /
    2,
};

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
