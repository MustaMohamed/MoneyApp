import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

export interface SearchTallyGeometry {
  slotHeight: number;
  lineHeight: number;
}

export function resolveSearchTallyGeometry(fontScale: number): SearchTallyGeometry {
  const lineHeight = lineHeightFor(scaledFontSize(Type.micro, fontScale));
  return { slotHeight: Spacing.xxs + lineHeight, lineHeight };
}
