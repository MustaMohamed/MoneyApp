import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import type { TypeOption } from '../account_type_pill';

/** `minHeight`, never `height`: at large font sizes long copy grows instead of clipping. */
export const FIELD_MESSAGE_RAIL_STYLE = {
  minHeight: Size.fieldMessageTrack,
  paddingTop: Size.fieldRailTextInset,
} as const;

/** Unscaled, matching HeroUI `FieldError`'s own 20pt line-height so the rail cannot shift. */
export const FIELD_MESSAGE_TEXT_LINE_HEIGHT = 20;

/** Error-state alert glyph — mockup `.msg svg`: 13px box, 2px top inset, 5px gap (mockup.html:559-560). */
export const FIELD_MESSAGE_GLYPH = {
  size: ms(13),
  topInset: ms(2),
  gap: ms(5),
} as const;

/** 3-column, 5-tile, left-aligned account-type grid at 114 x 76 pt (spec.md:73,124). */
export const ACCOUNT_TYPE_TILE_HEIGHT = ms(76);
export const ACCOUNT_TYPE_GRID_COLUMNS = 3;

/** HeroUI `Input` is 48dp unscaled at every scale; do not `ms()`-wrap `Size.fieldHeight` here. */
export const CREDIT_SLOT_MIN_HEIGHT = Size.fieldHeight + Spacing.md;

/** `Tabs.List` chrome: gap 4 + padding 3+3 (`tabs.css`), unscaled CSS px, so not `ms()`-scaled. */
export const CURRENCY_TABS_LIST_CHROME = 10;

export const CURRENCY_SEGMENT_WIDTH = ms(65);
export const CURRENCY_CELL_WIDTH = 2 * CURRENCY_SEGMENT_WIDTH + CURRENCY_TABS_LIST_CHROME;

export function chunkTypeOptions(
  options: readonly TypeOption[],
  columns: number,
): (TypeOption | null)[][] {
  const rows: (TypeOption | null)[][] = [];
  for (let i = 0; i < options.length; i += columns) {
    const row: (TypeOption | null)[] = options.slice(i, i + columns);
    while (row.length < columns) row.push(null);
    rows.push(row);
  }
  return rows;
}

export interface BalanceFieldModel {
  label: string;
  helper: string;
}

/** Credit Card relabels the balance field; it is never replaced, so nothing above it shifts. */
export function resolveBalanceField(type: AccountType): BalanceFieldModel {
  if (type === AccountType.CreditCard) {
    return { label: Strings.accountOwedLabel, helper: Strings.accountOwedHelper };
  }
  return { label: Strings.accountBalanceLabel, helper: Strings.accountBalanceHelper };
}
