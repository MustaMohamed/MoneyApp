import { Strings } from '@/constants/strings';

describe('accounts list load-error copy (F1)', () => {
  it('ships the three F1 strings byte-exact', () => {
    expect(Strings.accountsReadErrorTitle).toBe("Couldn't load your accounts");
    expect(Strings.accountsReadErrorDescription).toBe(
      'Something went wrong reading your data. Your accounts are still there.',
    );
    expect(Strings.accountsReadErrorRetry).toBe('Try again');
  });

  it('says what changed without apologising', () => {
    expect(Strings.accountsReadErrorDescription).not.toMatch(/sorry/i);
    expect(Strings.accountsReadErrorDescription).not.toMatch(/apolog/i);
  });
});

describe('accounts list type-filter copy (B7)', () => {
  it('ships the five section plurals byte-exact', () => {
    expect(Strings.accountsListSectionBanks).toBe('Banks');
    expect(Strings.accountsListSectionSmartWallets).toBe('Smart wallets');
    expect(Strings.accountsListSectionCashWallets).toBe('Cash wallets');
    expect(Strings.accountsListSectionSavings).toBe('Savings');
    expect(Strings.accountsListSectionCreditCards).toBe('Credit cards');
  });

  it('names the rail for screen readers', () => {
    expect(Strings.accountTypeFilterAccessibility).toBe('Account type filter');
  });
});

describe('accounts list reorder copy (B6, B7)', () => {
  it('ships the four fixed strings byte-exact', () => {
    expect(Strings.accountsReorderMoveUp).toBe('Move up');
    expect(Strings.accountsReorderMoveDown).toBe('Move down');
    expect(Strings.accountsReorderFilterNote).toBe('Reorder is off while a filter is on.');
    expect(Strings.accountsReorderError).toBe("Couldn't save the new order. Nothing was changed.");
  });

  it('labels the grip with the account name the row shows, unnamed included', () => {
    expect(Strings.accountsReorderGrip('CIB Current')).toBe('Reorder CIB Current');
    expect(Strings.accountsReorderGrip(Strings.unnamedAccount)).toBe('Reorder Unnamed account');
  });
});
