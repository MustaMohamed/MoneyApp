import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { Strings } from '@/constants/strings';
import { formatCurrencyAmount } from '@/utils/format_amount';

import type { Account } from '../../../../entities/account.entity';
import type { AccountsListTypeFilter } from '../accounts_list.state';

export interface ArchivedAccountRow {
  account: Account;
  caption: string;
}

/** The stored balance, formatted; an archived row has no stats or rate for a live figure. */
export function resolveArchivedRowCaption(
  account: Pick<Account, 'type' | 'current_balance' | 'currency'>,
): string {
  return Strings.accountsArchivedRowCaption(
    ACCOUNT_TYPE_LABELS[account.type],
    formatCurrencyAmount(account.current_balance, account.currency),
  );
}

export function resolveArchivedCardRows(
  archivedAccounts: Account[],
  typeFilter: AccountsListTypeFilter,
): ArchivedAccountRow[] {
  return archivedAccounts
    .filter((account) => typeFilter === 'all' || account.type === typeFilter)
    .map((account) => ({ account, caption: resolveArchivedRowCaption(account) }));
}

export function resolveArchivedSummary(rows: ArchivedAccountRow[]): string {
  return Strings.accountsArchivedSummary(rows.map((row) => row.account.name));
}
