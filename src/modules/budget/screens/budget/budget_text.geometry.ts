import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Size } from '@/constants/theme';

/** The 50/30/20 value column grows with the font scale, so a variance amount keeps its room in glyphs. */
export function resolveRuleValueColumnWidth(fontScale: number): number {
  return scaledFontSize(Size.budgetRuleValueColumn, fontScale);
}
