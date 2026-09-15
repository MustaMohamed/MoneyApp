import { HERO_GRADIENT_COLORS } from '@/components/ui/hero_gradient';
import { Colors } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { mixHex } from './account_badge_color';
import { DEFAULT_ACCOUNT_COLOR, contrastRatio, findAccountColor } from './account_palette';

type AccountTileColors = { background: string; glyph: string; border?: string };

type AccountTileVariant = 'filled' | 'hollow';

// The default sits in the palette (`account_palette.test.ts`), so the `??` is for the type only.
const FALLBACK_TILE_COLORS: Readonly<AccountTileColors> = Object.freeze({
  background: DEFAULT_ACCOUNT_COLOR,
  glyph: findAccountColor(DEFAULT_ACCOUNT_COLOR)?.tickColor ?? CoreTokens.text1,
});

// The hero gradient's middle stop; a ring that clears it clears the list card surface too.
const HOLLOW_BACKDROP = HERO_GRADIENT_COLORS[1];
const HOLLOW_MIN_CONTRAST_RATIO = 3;
const HOLLOW_SHARE_STEP = 0.05;
const HOLLOW_STEP_COUNT = Math.ceil(1 / HOLLOW_SHARE_STEP);

function resolveHollowTileColor(hex: string): string {
  for (let step = 0; step <= HOLLOW_STEP_COUNT; step += 1) {
    const share = Math.max(0, 1 - step * HOLLOW_SHARE_STEP);
    const candidate = step === 0 ? hex : mixHex(hex, CoreTokens.text1, share);
    if (contrastRatio(candidate, HOLLOW_BACKDROP) >= HOLLOW_MIN_CONTRAST_RATIO) return candidate;
  }
  return CoreTokens.text1;
}

/** The tile fill and the glyph on it; the palette entry already picked the legible glyph colour. */
export function resolveAccountTileColors(
  color: string | null,
  variant: AccountTileVariant = 'filled',
): AccountTileColors {
  const entry = color === null ? undefined : findAccountColor(color);
  if (variant === 'hollow') {
    // C4 `.id-tile.hollow`: no fill, a ring and a glyph in the account colour stepped toward the text colour.
    const hex = resolveHollowTileColor(entry?.hex ?? DEFAULT_ACCOUNT_COLOR);
    return { background: Colors.shared.transparent, glyph: hex, border: hex };
  }
  return entry ? { background: entry.hex, glyph: entry.tickColor } : FALLBACK_TILE_COLORS;
}
