import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

// The pill's `h-8` at scale 1.
const MONTH_PILL_MIN_HEIGHT = 32;

export interface MonthPillGeometry {
  label: { fontSize: number; lineHeight: number };
  height: number;
}

export function resolveMonthPillGeometry(fontScale: number): MonthPillGeometry {
  const fontSize = scaledFontSize(Type.micro, fontScale);
  const label = { fontSize, lineHeight: lineHeightFor(fontSize) };
  return { label, height: Math.max(MONTH_PILL_MIN_HEIGHT, label.lineHeight + 2 * Spacing.xxxs) };
}
