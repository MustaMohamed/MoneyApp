import type { SegmentFilterOption } from '@/components/ui/segment_filter.hook';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TYPE_OPTIONS } from '@/modules/accounts/components/account_type_pill';

import type { AccountsListTypeFilter } from './accounts_list.state';

export type AccountsListEmptyState = 'none' | 'archivedOnly' | 'noAccounts' | 'filtered';

/** Order comes from the account form's grid, never re-listed here, so the two cannot drift. */
export const ACCOUNTS_LIST_TYPE_FILTERS: ReadonlyArray<
  SegmentFilterOption<AccountsListTypeFilter>
> = [
  { value: 'all', label: Strings.filterAll },
  ...TYPE_OPTIONS.map(({ type, label }) => ({ value: type, label })),
];

// A sixth account type has to be given a plural here, not silently take the singular label.
const SECTION_TITLES: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.accountsListSectionBanks,
  [AccountType.SmartWallet]: Strings.accountsListSectionSmartWallets,
  [AccountType.PhysicalWallet]: Strings.accountsListSectionCashWallets,
  [AccountType.PhysicalSavings]: Strings.accountsListSectionSavings,
  [AccountType.CreditCard]: Strings.accountsListSectionCreditCards,
};

export function resolveAccountsListSectionTitle(selected: AccountsListTypeFilter): string {
  return selected === 'all' ? Strings.accountsListSection : SECTION_TITLES[selected];
}

export function resolveAccountsListEmptyState(input: {
  activeCount: number;
  archivedCount: number;
  visibleCount: number;
}): AccountsListEmptyState {
  // The archived-only block reads the same on every segment, so the active count decides first.
  if (input.activeCount === 0) return input.archivedCount > 0 ? 'archivedOnly' : 'noAccounts';
  return input.visibleCount === 0 ? 'filtered' : 'none';
}
