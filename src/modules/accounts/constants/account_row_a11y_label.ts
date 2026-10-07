import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { resolveAccountName } from '@/utils/account_name';
import { formatAccountBalance } from '@/utils/format_amount';

import type { Account } from '../entities/account.entity';

/** Reads `current_balance`, not `opening_balance`: the two are equal only at account creation. */
export function resolveAccountRowA11yLabel(account: Account): string {
  const balance = formatAccountBalance(account.current_balance, account.currency);
  return `${resolveAccountName(account)}, ${ACCOUNT_TYPE_LABELS[account.type]}, ${balance}`;
}
