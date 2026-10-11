import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Size } from '@/constants/theme';

/** The 50/30/20 value column grows with the font scale, so a variance amount keeps its room in glyphs. */
export function resolveRuleValueColumnWidth(fontScale: number): number {
  return scaledFontSize(Size.budgetRuleValueColumn, fontScale);
}

/** The ledger's month column grows with the font scale, so the in-progress month keeps its `*` on its line. */
export function resolveLedgerMonthColumnWidth(fontScale: number): number {
  return scaledFontSize(Size.budgetLedgerMonthColumn, fontScale);
}

/** The chart's month labels stop growing at the display headline's stop, so twelve of them draw at one size in their columns. */
export const BUDGET_CHART_LABEL_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;
