import type { ViewStyle } from 'react-native';

import { Size, Spacing } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { DEFAULT_ACCOUNT_COLOR, findAccountColor } from '../../../constants/account_palette';

/** B1 `.cb-row`, 12 on the right; layout keys sit here because `style` beats `className` in RN. */
export const ACCOUNTS_LIST_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: Size.accountListRowMinHeight,
  paddingLeft: Spacing.md,
  paddingRight: Spacing.sm,
  paddingVertical: Spacing.sm,
  gap: Spacing.sm,
  flexDirection: 'row',
  alignItems: 'center',
});

type AccountTileColors = { background: string; glyph: string };

// The default sits in the palette (`account_palette.test.ts`), so the `??` is for the type only.
const FALLBACK_TILE_COLORS: Readonly<AccountTileColors> = Object.freeze({
  background: DEFAULT_ACCOUNT_COLOR,
  glyph: findAccountColor(DEFAULT_ACCOUNT_COLOR)?.tickColor ?? CoreTokens.text1,
});

/** The tile fill and the glyph on it; the palette entry already picked the legible glyph colour. */
export function resolveAccountTileColors(color: string | null): AccountTileColors {
  const entry = color === null ? undefined : findAccountColor(color);
  return entry ? { background: entry.hex, glyph: entry.tickColor } : FALLBACK_TILE_COLORS;
}
