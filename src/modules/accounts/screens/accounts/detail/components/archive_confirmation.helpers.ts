import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { formatAccountBalance, formatAccountBalanceParts } from '@/utils/format_amount';

import type { Account } from '../../../../store/account.store';

/** G2's warning line: a credit card only, and only while its balance prints as something. */
export function resolveArchiveCcLine(
  account: Pick<Account, 'type' | 'current_balance' | 'currency'>,
): string | undefined {
  if (account.type !== AccountType.CreditCard) return undefined;
  if (formatAccountBalanceParts(account.current_balance, account.currency).printsAsZero) {
    return undefined;
  }
  return Strings.accountDetailArchiveCCWarning(
    formatAccountBalance(account.current_balance, account.currency),
  );
}
