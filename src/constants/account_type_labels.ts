import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

/**
 * The one account-type label source — the `account_palette.ts` house pattern:
 * one module-level source per account attribute. Before this file existed
 * (issue #240), the same five-entry literal was copied at five call sites:
 * `more_accounts.geometry.ts`, `account_row.tsx`, `detail.helpers.ts`,
 * `balance_hero.tsx`, and `dashboard/index.tsx` (which derives an uppercase
 * variant at its use site rather than carrying a sixth copy).
 *
 * `account_type_pill.tsx`'s `TYPE_OPTIONS` is a different shape — label plus
 * type, for a picker — and is not a sixth consumer of this map.
 */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};
