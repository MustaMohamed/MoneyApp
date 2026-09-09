import { Colors } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { DEFAULT_ACCOUNT_COLOR, findAccountColor } from './account_palette';

type AccountTileColors = { background: string; glyph: string; border?: string };

export type AccountTileVariant = 'filled' | 'hollow';

// The default sits in the palette (`account_palette.test.ts`), so the `??` is for the type only.
const FALLBACK_TILE_COLORS: Readonly<AccountTileColors> = Object.freeze({
  background: DEFAULT_ACCOUNT_COLOR,
  glyph: findAccountColor(DEFAULT_ACCOUNT_COLOR)?.tickColor ?? CoreTokens.text1,
});

/** The tile fill and the glyph on it; the palette entry already picked the legible glyph colour. */
export function resolveAccountTileColors(
  color: string | null,
  variant: AccountTileVariant = 'filled',
): AccountTileColors {
  const entry = color === null ? undefined : findAccountColor(color);
  if (variant === 'hollow') {
    // C4 `.id-tile.hollow`: no fill, a ring and a glyph in the account's own colour.
    const hex = entry?.hex ?? DEFAULT_ACCOUNT_COLOR;
    return { background: Colors.shared.transparent, glyph: hex, border: hex };
  }
  return entry ? { background: entry.hex, glyph: entry.tickColor } : FALLBACK_TILE_COLORS;
}
