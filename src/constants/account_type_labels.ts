import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

/**
 * The one account-type label source: one module-level source per account
 * attribute, as `account_palette.ts` keeps for colours. Before this file
 * existed (issue #240), four call sites each carried an independent copy of
 * the same five-entry literal, and a fifth imported one of those copies
 * rather than defining its own.
 *
 * `account_type_pill.tsx`'s `TYPE_OPTIONS` keeps its own shape — label plus
 * icon plus type, for a picker — but sources its `label` field from here
 * rather than carrying a sixth copy of the text.
 */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};
