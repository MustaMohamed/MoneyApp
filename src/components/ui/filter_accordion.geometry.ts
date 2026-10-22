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
