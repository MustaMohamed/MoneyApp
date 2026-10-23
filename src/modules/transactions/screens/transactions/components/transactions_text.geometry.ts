import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { scaledFontSize, scaledLineHeight } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type } from '@/constants/theme';

/** The hero's text stops growing past this OS font scale (ADR 2026-09-27-transactions-search-tally §7). */
export const TRANSACTIONS_HERO_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;

export interface TransactionsHeroGeometry {
  overline: number;
  hero: number;
  subhead: number;
  micro: number;
  body: number;
  chip: number;
  header: number;
  amount: number;
  columns: number;
  rail: number;
  caption: number;
}

// Each row is its text's line box at the text's own size, so the rows and the skeleton's bars match the text to the dp.
export function resolveTransactionsHeroGeometry(fontScale: number): TransactionsHeroGeometry {
  const size = (fontSize: number) =>
    scaledFontSize(fontSize, fontScale, TRANSACTIONS_HERO_MAX_FONT_SCALE);
  const line = (fontSize: number) =>
    scaledLineHeight(fontSize, fontScale, TRANSACTIONS_HERO_MAX_FONT_SCALE);
  return {
    overline: size(Type.overline),
    hero: size(Type.hero),
    subhead: size(Type.subhead),
    micro: size(Type.micro),
    body: size(Type.body),
    chip: size(Type.chip),
    header: line(Type.overline),
    amount: line(Type.hero),
    columns: line(Type.micro) + Spacing.xxxs + line(Type.body),
    rail: Size.progressThin,
    caption: line(Type.chip),
  };
}
