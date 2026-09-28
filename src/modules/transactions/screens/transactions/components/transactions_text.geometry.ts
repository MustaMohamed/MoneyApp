import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

/** The hero's text stops growing past this OS font scale (ADR 2026-09-27-transactions-search-tally §7). */
export const TRANSACTIONS_HERO_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;

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
  const overline = size(Type.overline);
  const hero = size(Type.hero);
  const micro = size(Type.micro);
  const body = size(Type.body);
  const chip = size(Type.chip);
  return {
    overline,
    hero,
    subhead: size(Type.subhead),
    micro,
    body,
    chip,
    header: lineHeightFor(overline),
    amount: lineHeightFor(hero),
    columns: lineHeightFor(micro) + Spacing.xxxs + lineHeightFor(body),
    rail: Size.progressThin,
    caption: lineHeightFor(chip),
  };
}

export interface DayHeaderGeometry {
  fontSize: number;
  lineHeight: number;
  pillHeight: number;
  height: number;
}

// Uncapped: the day header scales its text with the OS, so every box grows from the one scaled size.
export function resolveDayHeaderGeometry(fontScale: number): DayHeaderGeometry {
  const fontSize = scaledFontSize(Type.caption, fontScale);
  const text = { fontSize, lineHeight: lineHeightFor(fontSize) };
  const pillHeight = text.lineHeight + 2 * Spacing.xxxs;
  return { ...text, pillHeight, height: Spacing.md + pillHeight + Spacing.xs };
}
