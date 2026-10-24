import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type } from '@/constants/theme';

/** The hero's text stops growing past this OS font scale (ADR 2026-09-27-transactions-search-tally §7). */
export const LIST_HERO_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;

export interface ListHeroGeometry {
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

// Each row is the line box of its text's scaled style, so the rows and the skeleton's bars match the text to the dp.
export function resolveListHeroGeometry(fontScale: number): ListHeroGeometry {
  const style = (fontSize: number) =>
    scaledTextStyle(fontSize, fontScale, LIST_HERO_MAX_FONT_SCALE);
  const overline = style(Type.overline);
  const hero = style(Type.hero);
  const micro = style(Type.micro);
  const body = style(Type.body);
  const chip = style(Type.chip);
  return {
    overline: overline.fontSize,
    hero: hero.fontSize,
    subhead: style(Type.subhead).fontSize,
    micro: micro.fontSize,
    body: body.fontSize,
    chip: chip.fontSize,
    header: overline.lineHeight,
    amount: hero.lineHeight,
    columns: micro.lineHeight + Spacing.xxxs + body.lineHeight,
    rail: Size.progressThin,
    caption: chip.lineHeight,
  };
}
