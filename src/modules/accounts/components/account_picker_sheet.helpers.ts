import { formatCurrencyAmount } from '@/utils/format_amount';

import type { Account } from '../entities/account.entity';

/**
 * Exported for `__tests__/screens/accounts/account_picker_sheet.helpers.test.ts`. Asserted
 * independently of `account_card.tsx`'s identical one-liner (`buildBalanceText`) per spec
 * row 10 ("two files, two guards") — deliberately not a shared helper.
 */
export function resolvePickerRowBalance(account: Account): string {
  return formatCurrencyAmount(account.current_balance, account.currency);
}
