import { AccountType } from '@/constants/enums';
import { TYPE_OPTIONS } from '@/modules/accounts/components/account_type_pill';
import {
  ACCOUNTS_LIST_TYPE_FILTERS,
  isAccountsListReorderable,
  resolveAccountsListEmptyState,
  resolveAccountsListSectionTitle,
  matchesAccountsListType,
  resolveArchivedCardType,
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

describe('resolveArchivedCardType', () => {
  it.each([
    ['archivedOnly', AccountType.Bank, 'all'],
    ['none', AccountType.Bank, AccountType.Bank],
    ['filtered', AccountType.Bank, AccountType.Bank],
    ['noAccounts', AccountType.Bank, AccountType.Bank],
    ['none', 'all', 'all'],
  ] as const)('%s under %s holds %s', (emptyState, selectedType, expected) => {
    expect(resolveArchivedCardType({ emptyState, selectedType })).toBe(expected);
  });
});

describe('matchesAccountsListType', () => {
  it.each([
    [AccountType.Bank, 'all', true],
    [AccountType.CreditCard, 'all', true],
    [AccountType.Bank, AccountType.Bank, true],
    [AccountType.SmartWallet, AccountType.Bank, false],
  ] as const)('%s under %s matches: %s', (type, filter, expected) => {
    expect(matchesAccountsListType(type, filter)).toBe(expected);
  });
});

describe('isAccountsListReorderable', () => {
  it('is on under All', () => {
    expect(isAccountsListReorderable('all')).toBe(true);
  });

  it.each(Object.values(AccountType))('is off under the %s filter', (type) => {
    expect(isAccountsListReorderable(type)).toBe(false);
  });
});
