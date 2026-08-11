import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import type { TypeOption } from '../account_type_pill';

/**
 * Pure geometry and pure view-model resolvers for the redesigned account
 * form (MA-009). No React, following the house pattern set by
 * account_color_sheet.geometry.ts / onboarding_shell.geometry.ts — every
 * value here is either a named theme token or a composition of two tokens
 * this scope already shipped (MA-001), never a bare literal wearing a token.
 */

/**
 * The message rail under every field — spec.md § "The zero-shift contract".
 * `minHeight`, never `height`: at accessibility font sizes the rail is a
 * floor, not a ceiling, and long copy grows into the scroll viewport instead
 * of clipping (spec.md:45). `paddingTop` is `Size.fieldRailTextInset`
 * (theme.ts) — MA-009 post-approval fix F7 named the bare `3` this used to
 * be; see that token's own comment for why routing it through `ms()` is
 * visually a no-op.
 */
export const FIELD_MESSAGE_RAIL_STYLE = {
  minHeight: Size.fieldMessageTrack,
  paddingTop: Size.fieldRailTextInset,
} as const;

/**
 * The rail's own text has to declare this explicitly — HeroUI `Typography`'s
 * default `type="body"` carries a fixed 28pt unscaled `line-height`
 * (`text.css:49-52`, `calc(var(--spacing) * 7)`), which survives an
 * `style={{ fontSize }}` override because `style` only wins on the
 * properties it sets. Left alone, the helper state (this line-height) and
 * the error state (HeroUI `FieldError`'s own `--text-sm--line-height`, 20pt
 * unscaled — field-error.css:6-7) render at different heights and the rail
 * moves when the message swaps — measured on the emulator, not assumed.
 * `20`, not `Size.fieldMessageTrack`, deliberately: FieldError's line-height
 * is itself unscaled CSS, so matching it with another unscaled literal keeps
 * the two states equal at every `ms()` scale, not just near 1.0.
 */
export const FIELD_MESSAGE_TEXT_LINE_HEIGHT = 20;

/** 3-column, 5-tile, left-aligned account-type grid at 114 x 76 pt (spec.md:73,124). */
export const ACCOUNT_TYPE_TILE_HEIGHT = ms(76);
export const ACCOUNT_TYPE_GRID_COLUMNS = 3;

/**
 * The reserved credit slot's own minimum height — a composition of two
 * tokens MA-001 already shipped, not a sixth Size token. **Consistently
 * scaled**: both terms now go through `ms()`, whereas the original
 * `Size.fieldHeight + Spacing.md` added an intentionally-unscaled 48 to an
 * already-`ms()`-scaled 16, so "48 + 16 = 64" only held at scale 1.0 and
 * silently diverged everywhere else (MA-009 post-approval fix F6). At scale
 * 1.0 this is still exactly 48 + 16 = 64, against the mockup's 44 + 16 = 60
 * (the +4 is Size.fieldHeight's own ruling, spec.md § Geometry tokens,
 * propagating here); off scale 1.0 both terms now grow together instead of
 * one term standing still while the other scales underneath it. Unlike
 * `Size.fieldHeight` itself elsewhere, this value has no real HeroUI
 * `Input` to pixel-match — it only has to roughly reserve "one field row
 * plus a gap" for a placeholder — so scaling it with the rest of the
 * form's geometry is the more consistent choice than inheriting
 * `Size.fieldHeight`'s narrow, deliberately-unscaled exception.
 */
export const CREDIT_SLOT_MIN_HEIGHT = ms(Size.fieldHeight) + Spacing.md;

/**
 * Tabs.List's own chrome around its two segments — gap 4 + padding 3+3
 * (tabs.css:10,14), unscaled CSS px straight from HeroUI's stylesheet.
 * Deliberately NOT ms()-scaled, the same way `Size.fieldHeight` (theme.ts)
 * is deliberately not — named, rather than left as a bare `+ 10` in
 * `CURRENCY_CELL_WIDTH` below, so the intent carries in the name the way
 * `Size.fieldHeight` already does (MA-009 post-approval fix F7).
 */
export const CURRENCY_TABS_LIST_CHROME = 10;

/**
 * The currency control's compact geometry — decision 1. `segmentWidth` is
 * reachable exactly through SegmentedTabs' own prop; the cell has to be at
 * least as wide as the composed Tabs.List (2 segments + `CURRENCY_TABS_
 * LIST_CHROME`).
 */
export const CURRENCY_SEGMENT_WIDTH = ms(65);
export const CURRENCY_CELL_WIDTH = 2 * CURRENCY_SEGMENT_WIDTH + CURRENCY_TABS_LIST_CHROME;

/**
 * Chunks the five type options into rows of `columns`, padding the last row
 * with `null` so every row has the same length. Selection never changes
 * this input, so grid position cannot move when the user picks a tile.
 */
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

/**
 * The balance field is relabelled, never replaced (spec.md § N2). Choosing
 * Credit Card swaps the label and helper only — nothing above it shifts,
 * because nothing was inserted.
 */
export function resolveBalanceField(type: AccountType): BalanceFieldModel {
  if (type === AccountType.CreditCard) {
    return { label: Strings.accountOwedLabel, helper: Strings.accountOwedHelper };
  }
  return { label: Strings.accountBalanceLabel, helper: Strings.accountBalanceHelper };
}
