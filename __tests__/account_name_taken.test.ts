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
});
