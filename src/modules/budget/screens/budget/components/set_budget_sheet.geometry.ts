import { type ScaledTextStyle, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size } from '@/constants/theme';

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
    height: Math.max(Size.setBudgetFieldTrack, text.lineHeight + 2 * Size.fieldBorderWidth),
  };
}
