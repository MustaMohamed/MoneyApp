import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

/** Android reserves a truncated line's `…` in the paint's Roboto (0.669 em), and Inter SemiBold draws it at 0.956 em (StaticLayout.java:1189). */
export const INTER_SEMIBOLD_ELLIPSIS_RESERVE_SCALE = 1.45;

export interface SearchTallyGeometry {
  slotHeight: number;
  lineHeight: number;
}

export function resolveSearchTallyGeometry(fontScale: number): SearchTallyGeometry {
  const lineHeight = lineHeightFor(scaledFontSize(Type.micro, fontScale));
  return { slotHeight: Spacing.xxs + lineHeight, lineHeight };
}
