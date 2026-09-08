import { AccountType } from '@/constants/enums';
import { TYPE_OPTIONS } from '@/modules/accounts/components/account_type_pill';
import {
  ACCOUNTS_LIST_TYPE_FILTERS,
  resolveAccountsListEmptyState,
  resolveAccountsListSectionTitle,
} from '@/modules/accounts/screens/accounts/list/accounts_list.presentation';

describe('ACCOUNTS_LIST_TYPE_FILTERS', () => {
  it('leads with All and follows the account form grid order', () => {
    expect(ACCOUNTS_LIST_TYPE_FILTERS.map((filter) => filter.value)).toEqual([
      'all',
      ...TYPE_OPTIONS.map((option) => option.type),
    ]);
  });

  it('reads the shipped type labels', () => {
    expect(ACCOUNTS_LIST_TYPE_FILTERS.map((filter) => filter.label)).toEqual([
      'All',
      'Bank',
      'Smart Wallet',
      'Cash Wallet',
      'Savings',
      'Credit Card',
    ]);
  });

  it('carries no icon: the rail is text only', () => {
    for (const filter of ACCOUNTS_LIST_TYPE_FILTERS) {
      expect(filter.icon).toBeUndefined();
    }
  });
});

describe('resolveAccountsListSectionTitle', () => {
  it.each([
    ['all', 'Your accounts'],
    [AccountType.Bank, 'Banks'],
    [AccountType.SmartWallet, 'Smart wallets'],
    [AccountType.PhysicalWallet, 'Cash wallets'],
    [AccountType.PhysicalSavings, 'Savings'],
    [AccountType.CreditCard, 'Credit cards'],
  ] as const)('%s reads %s', (selected, expected) => {
    expect(resolveAccountsListSectionTitle(selected)).toBe(expected);
  });
});

describe('resolveAccountsListEmptyState', () => {
  it.each([
    [{ activeCount: 0, archivedCount: 0, visibleCount: 0 }, 'noAccounts'],
    [{ activeCount: 0, archivedCount: 1, visibleCount: 0 }, 'archivedOnly'],
    [{ activeCount: 2, archivedCount: 0, visibleCount: 0 }, 'filtered'],
    [{ activeCount: 2, archivedCount: 3, visibleCount: 0 }, 'filtered'],
    [{ activeCount: 2, archivedCount: 0, visibleCount: 1 }, 'none'],
    [{ activeCount: 1, archivedCount: 0, visibleCount: 1 }, 'none'],
  ] as const)('%j resolves to %s', (input, expected) => {
    expect(resolveAccountsListEmptyState(input)).toBe(expected);
  });
});
