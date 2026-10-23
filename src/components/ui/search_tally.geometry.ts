import { scaledLineHeight } from '@/components/ui/text_scale.geometry';
import { Spacing, Type } from '@/constants/theme';

export interface SearchTallyGeometry {
  slotHeight: number;
  lineHeight: number;
}

export function resolveSearchTallyGeometry(fontScale: number): SearchTallyGeometry {
  const lineHeight = scaledLineHeight(Type.micro, fontScale);
  return { slotHeight: Spacing.xxs + lineHeight, lineHeight };
}
