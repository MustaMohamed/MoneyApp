import type { ViewStyle } from 'react-native';

import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing } from '@/constants/theme';
import {
  DEFAULT_ACCOUNT_COLOR,
  findAccountColor,
} from '@/modules/accounts/constants/account_palette';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { BROADSHEET_HEADLINE_TRACKING_EM } from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';
import { formatCurrencyParts } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

/**
 * N3's row geometry and the three pure resolvers behind its columns.
 *
 * The resolvers live here rather than inside the row so the suite can assert
 * decimals-by-currency, the `current_balance` field read and the colour
 * fallback without rendering anything.
 */

/** mockup.html:619, `.lrow { min-height: var(--size-budget-category-row-height) }`. */
export const N3_ROW_MIN_HEIGHT = Size.budgetCategoryRowHeight;

/**
 * The whole geometry of a row — mockup.html:617-620, `.lrow`.
 *
 * Frozen for the reason `CURRENCY_ROW_STYLE` is (MA-010 #234): it is shared by
 * reference across every row, so one stray assignment would move all of them,
 * and a suite that reads keys at module load would not notice.
 *
 * Carries **no `height`** — S3's contract is that truncating a name cannot
 * change the row or move the amount column — and **no colour key of any kind**:
 * the group paints the fill, the row is transparent (§5.3). `flexDirection` and
 * `alignItems` are stated here rather than left to `.list-group__item`, because
 * `style` beats `className` in RN and a half-overridden layout is the
 * `TILE_BOX_STYLE` trap (`account_type_tile.tsx:14-19`).
 */
export const N3_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: N3_ROW_MIN_HEIGHT,
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.sm,
  gap: Spacing.sm,
  flexDirection: 'row',
  alignItems: 'center',
});

/** mockup.html:624, `.lrow .ty { gap: 5px }`. */
export const N3_ROW_TYPE_GAP = ms(5);

/** mockup.html:625, `.lrow .ty svg { width: 13px }`. */
export const N3_ROW_TYPE_GLYPH = ms(13);

/** mockup.html:2014, the headline's inline `line-height: 1.12`. */
export const N3_HEADLINE_LINE_HEIGHT_RATIO = 1.12;

/**
 * mockup.html:411, `.b-headline { letter-spacing: -0.01em }` — repointed at the
 * shell constant now that N4 is the third Broadsheet screen (issue #241, the
 * half its disposition allows). Same value, same exported name, so N3's suite
 * and `index.tsx` are untouched.
 */
export const N3_HEADLINE_TRACKING_EM = BROADSHEET_HEADLINE_TRACKING_EM;

/**
 * The row's type label — mockup.html:624, `.lrow .ty`. Lives beside the
 * resolvers because `resolveAccountRowA11yLabel` needs it and a resolver must
 * not import a component.
 */
export const N3_ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};

/**
 * The dot's fill — mockup.html:574, `.dot`. `null` and any hex outside the 32
 * both fall back to `DEFAULT_ACCOUNT_COLOR`.
 *
 * The null guard has to precede the lookup: `findAccountColor` takes `string`,
 * not `string | null`. Not written as `color ?? DEFAULT_ACCOUNT_COLOR` — that
 * shape puts an unknown hex straight onto the swatch.
 */
export function resolveAccountRowDotColor(color: string | null): string {
  if (color === null) return DEFAULT_ACCOUNT_COLOR;
  return findAccountColor(color)?.hex ?? DEFAULT_ACCOUNT_COLOR;
}

/**
 * `"CIB Current, Bank, 48,250 EGP"` — one label for the whole row, so a screen
 * reader reads it as one thing instead of four. The dot is decorative and
 * contributes nothing.
 *
 * `current_balance`, never `opening_balance` (§4): business rule 6 makes the
 * two equal at creation, so the old field read correctly through onboarding
 * and incorrectly ever after. Decimals come from `CURRENCY_CONFIG`, never a
 * literal — this is the audit-M1 fix. EGP renders 0 decimals: `CURRENCY_CONFIG`
 * is the app-wide contract and it says so. The mockup draws `48,250.00`
 * (:2024, :2034); that is a deliberate, recorded deviation — see spec §3 S4.
 * A USD row is the one that shows cents.
 */
export function resolveAccountRowA11yLabel(account: Account): string {
  const { value, code } = formatCurrencyParts(account.current_balance, account.currency);
  return `${account.name}, ${N3_ACCOUNT_TYPE_LABELS[account.type]}, ${value} ${code}`;
}
