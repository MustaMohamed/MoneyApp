import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import type { Account } from '../../../../store/account.store';
import { formatAccountBalanceParts } from './balance_hero.helpers';

/** G2's warning line: a credit card only, and only while its balance prints as something. */
export function resolveArchiveCcLine(
  account: Pick<Account, 'type' | 'current_balance' | 'currency'>,
): string | undefined {
  if (account.type !== AccountType.CreditCard) return undefined;
  const { amount, code, printsAsZero } = formatAccountBalanceParts(
    account.current_balance,
    account.currency,
  );
  if (printsAsZero) return undefined;
  return Strings.accountDetailArchiveCCWarning(`${amount} ${code}`);
}
