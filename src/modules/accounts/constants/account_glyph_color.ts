import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';

import { mixHex } from './account_badge_color';
import { contrastRatio } from './account_palette';
import { stepTowardText } from './account_tile_color';

// WCAG 2.2 non-text contrast: a glyph in the account colour clears 3:1 on everything it sits on.
const GLYPH_MIN_CONTRAST_RATIO = 3;
// `chip.tsx` fills over the sheet surface: unselected `bg-default/40`, selected `bg-accent/15`.
const CHIP_UNSELECTED_FILL_ALPHA = 0.4;
const CHIP_SELECTED_FILL_ALPHA = 0.15;

// The sheet surface, `bg-default` (`--default`), and the filter chip's two fills as painted.
const GLYPH_BACKDROPS: readonly string[] = [
  CoreTokens.surface,
  CoreTokens.surfaceEl,
  mixHex(CoreTokens.surfaceEl, CoreTokens.surface, CHIP_UNSELECTED_FILL_ALPHA),
  mixHex(GoldTokens[500], CoreTokens.surface, CHIP_SELECTED_FILL_ALPHA),
];

function clearsEveryBackdrop(candidate: string): boolean {
  return GLYPH_BACKDROPS.every(
    (backdrop) => contrastRatio(candidate, backdrop) >= GLYPH_MIN_CONTRAST_RATIO,
  );
}

/** An account colour drawn as a glyph, stepped toward the text colour until it clears 3:1; the stored colour is untouched. */
export function resolveAccountGlyphColor(hex: string | null | undefined): string {
  if (hex === null || hex === undefined) return CoreTokens.text2;
  return stepTowardText(hex, clearsEveryBackdrop);
}
