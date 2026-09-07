import { Strings } from '@/constants/strings';

describe('B2 archived-only empty copy — the one plural point', () => {
  it.each([
    [1, 'Your 1 archived account is below. Unarchive it, or add a new account.'],
    [2, 'Your 2 archived accounts are below. Unarchive one, or add a new account.'],
    [5, 'Your 5 archived accounts are below. Unarchive one, or add a new account.'],
  ] as const)('emptyAccountsArchivedOnlyDescription(%i)', (n, expected) => {
    expect(Strings.emptyAccountsArchivedOnlyDescription(n)).toBe(expected);
  });

  it('keeps the headline and reuses the shipped Add Account label', () => {
    expect(Strings.emptyAccountsArchivedOnlyHeadline).toBe('No active accounts');
    expect(Strings.emptyAccountsCta).toBe('Add Account');
  });

  it('leaves B3 copy untouched', () => {
    expect(Strings.emptyAccountsHeadline).toBe('No accounts yet');
    expect(Strings.emptyAccountsDescription).toBe(
      'Add your first account to start tracking your money.',
    );
  });
});
