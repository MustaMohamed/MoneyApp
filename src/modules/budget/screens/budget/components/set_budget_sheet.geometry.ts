import { type ScaledTextStyle, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size } from '@/constants/theme';
import { ms } from '@/utils/responsive';

const FIELD_TRACK = ms(28);

export interface SetBudgetFieldGeometry {
  text: ScaledTextStyle;
  height: number;
}

/** For an input drawn with `allowFontScaling={false}`: the box holds its app-scaled line and the Android border on both edges. */
export function resolveSetBudgetFieldGeometry(
  fontSize: number,
  fontScale: number,
): SetBudgetFieldGeometry {
  const text = scaledTextStyle(fontSize, fontScale);
  return {
    text,
    height: Math.max(FIELD_TRACK, text.lineHeight + 2 * Size.fieldBorderWidth),
  };
}
