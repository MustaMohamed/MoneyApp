import { resolveAccountsListContent } from '@/modules/accounts/screens/accounts/list/accounts_list.helpers';

describe('resolveAccountsListContent', () => {
  it.each([
    [true, 0, 'error'],
    [true, 3, 'error'],
    [false, 0, 'empty'],
    [false, 1, 'rows'],
  ])('loadError %s with %i rows shows %s', (loadError, accountCount, expected) => {
    expect(resolveAccountsListContent({ loadError, accountCount })).toBe(expected);
  });
});
