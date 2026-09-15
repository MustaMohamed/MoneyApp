import { isAccountNameTaken } from '@/modules/accounts/utils/account_name_taken';
import { makeTestAccount } from '@/test_helpers/transaction';

const accounts = [
  makeTestAccount({ id: 'a1', name: 'CIB Savings' }),
  makeTestAccount({ id: 'a2', name: '  Old Card  ' }),
];

describe('isAccountNameTaken', () => {
  it('is false against an empty list', () => {
    expect(isAccountNameTaken([], 'CIB Savings')).toBe(false);
    expect(isAccountNameTaken([], 'CIB Savings', 'a1')).toBe(false);
  });

  it('matches an exact name', () => {
    expect(isAccountNameTaken(accounts, 'CIB Savings')).toBe(true);
  });

  it('matches whatever the case is on either side', () => {
    expect(isAccountNameTaken(accounts, 'cib savings')).toBe(true);
    expect(isAccountNameTaken([makeTestAccount({ name: 'cib savings' })], 'CIB SAVINGS')).toBe(
      true,
    );
  });

  it('trims the candidate and the stored name alike', () => {
    expect(isAccountNameTaken(accounts, '  CIB Savings  ')).toBe(true);
    expect(isAccountNameTaken(accounts, 'Old Card')).toBe(true);
  });

  it('is false on a name no account holds', () => {
    expect(isAccountNameTaken(accounts, 'Wallet')).toBe(false);
  });

  it('does not count the excluded account against itself', () => {
    expect(isAccountNameTaken(accounts, 'CIB Savings', 'a1')).toBe(false);
  });

  it('still counts another account holding the name', () => {
    expect(isAccountNameTaken(accounts, 'CIB Savings', 'a2')).toBe(true);
  });

  it('counts every account when no id is excluded', () => {
    expect(isAccountNameTaken(accounts, 'CIB Savings', undefined)).toBe(true);
  });

  describe('format characters are ignored on both sides', () => {
    const cash = [makeTestAccount({ id: 'c1', name: 'Cash' })];

    it('matches a candidate led by a right-to-left mark', () => {
      expect(isAccountNameTaken(cash, '\u200FCash')).toBe(true);
    });

    it('matches a stored name ending in a zero-width space', () => {
      expect(isAccountNameTaken([makeTestAccount({ name: 'Cash\u200B' })], 'Cash')).toBe(true);
    });

    it('strips the mark before trimming, so spaces around it still fold', () => {
      expect(isAccountNameTaken(cash, ' \u200Fcash ')).toBe(true);
    });

    it('matches a candidate with a zero-width joiner inside', () => {
      expect(isAccountNameTaken(cash, 'Ca\u200Dsh')).toBe(true);
    });

    it('is false on a different name beside a marked one', () => {
      expect(isAccountNameTaken([makeTestAccount({ name: '\u200FCash' })], 'Wallet')).toBe(false);
    });

    it('still excludes the account when the mark is the only difference', () => {
      expect(isAccountNameTaken(cash, '\u200FCash', 'c1')).toBe(false);
    });
  });
});
