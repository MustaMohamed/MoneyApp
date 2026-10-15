import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';

import { mixHex } from './account_badge_color';
import { NON_TEXT_MIN_CONTRAST_RATIO, contrastRatio } from './account_palette';
import { stepTowardText } from './account_tile_color';

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
    (backdrop) => contrastRatio(candidate, backdrop) >= NON_TEXT_MIN_CONTRAST_RATIO,
  );
}

/** An account colour drawn as a glyph, stepped toward the text colour until it clears 3:1; the stored colour is untouched. */
export function resolveAccountGlyphColor(hex: string | null | undefined): string {
  return stepTowardText(hex ?? CoreTokens.text2, clearsEveryBackdrop);
}
