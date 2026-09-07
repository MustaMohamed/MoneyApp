import type { ViewStyle } from 'react-native';

import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { Size, Spacing } from '@/constants/theme';
import { formatCurrencyParts } from '@/utils/format_amount';

import { DEFAULT_ACCOUNT_COLOR, findAccountColor } from '../../../constants/account_palette';
import type { Account } from '../../../entities/account.entity';

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

export type AccountTileColors = { background: string; glyph: string };

/** The tile fill and the glyph on it; the palette entry already picked the legible glyph colour. */
export function resolveAccountTileColors(color: string | null): AccountTileColors {
  const entry = (color === null ? undefined : findAccountColor(color)) ?? fallbackEntry();
  return { background: entry.hex, glyph: entry.tickColor };
}

function fallbackEntry() {
  const entry = findAccountColor(DEFAULT_ACCOUNT_COLOR);
  if (!entry) throw new Error('DEFAULT_ACCOUNT_COLOR is outside the account palette');
  return entry;
}

/** Reads `current_balance`, not `opening_balance`: the two are equal only at account creation. */
export function resolveAccountListRowA11yLabel(account: Account): string {
  const { value, code } = formatCurrencyParts(account.current_balance, account.currency);
  return `${account.name}, ${ACCOUNT_TYPE_LABELS[account.type]}, ${value} ${code}`;
}
