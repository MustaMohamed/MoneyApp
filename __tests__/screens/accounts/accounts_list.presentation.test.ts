import { resolveAccountsListEmptyState } from '@/modules/accounts/screens/accounts/list/accounts_list.presentation';

describe('resolveAccountsListEmptyState', () => {
  it.each([
    [{ activeCount: 0, archivedCount: 0 }, 'noAccounts'],
    [{ activeCount: 0, archivedCount: 1 }, 'archivedOnly'],
    [{ activeCount: 1, archivedCount: 0 }, 'none'],
    [{ activeCount: 2, archivedCount: 3 }, 'none'],
  ] as const)('%j resolves to %s', (input, expected) => {
    expect(resolveAccountsListEmptyState(input)).toBe(expected);
  });
});
