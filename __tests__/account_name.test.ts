import { Strings } from '@/constants/strings';
import { makeTestAccount } from '@/test_helpers/transaction';
import { resolveAccountName } from '@/utils/account_name';

describe('resolveAccountName', () => {
  it('reads the account name of a live account', () => {
    expect(resolveAccountName(makeTestAccount({ name: 'CIB Savings' }))).toBe('CIB Savings');
  });

  it('reads the account name of an archived account', () => {
    expect(resolveAccountName(makeTestAccount({ name: 'Old Wallet', is_archived: 1 }))).toBe(
      'Old Wallet',
    );
  });

  it('reads "Deleted Account" for a deleted account', () => {
    expect(resolveAccountName(makeTestAccount({ is_deleted: 1, is_archived: 1 }))).toBe(
      Strings.deletedAccount,
    );
  });

  it('decides on the flag, not on the scrubbed name', () => {
    expect(resolveAccountName(makeTestAccount({ name: '', is_deleted: 1, is_archived: 1 }))).toBe(
      Strings.deletedAccount,
    );
    expect(resolveAccountName(makeTestAccount({ name: '', is_deleted: 0 }))).toBe('');
  });

  it('reads "Unknown account" for an id that did not resolve', () => {
    expect(resolveAccountName(undefined)).toBe(Strings.unknownAccount);
  });

  it('keeps the two fallbacks distinct', () => {
    expect(Strings.deletedAccount).not.toBe(Strings.unknownAccount);
  });
});
