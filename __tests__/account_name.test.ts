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
    expect(resolveAccountName(makeTestAccount({ name: '', is_deleted: 0 }))).toBe(
      Strings.unnamedAccount,
    );
  });

  it('reads "Deleted Account", not "Unnamed account", for a deleted account with a blank name', () => {
    expect(
      resolveAccountName(makeTestAccount({ name: '   ', is_deleted: 1, is_archived: 1 })),
    ).toBe(Strings.deletedAccount);
  });

  it('reads "Unnamed account" for a live name that is blank after trimming', () => {
    expect(resolveAccountName(makeTestAccount({ name: '   ' }))).toBe(Strings.unnamedAccount);
    expect(resolveAccountName(makeTestAccount({ name: '\t\n ' }))).toBe(Strings.unnamedAccount);
  });

  it('reads an archived blank name as "Unnamed account"', () => {
    expect(resolveAccountName(makeTestAccount({ name: '', is_archived: 1 }))).toBe(
      Strings.unnamedAccount,
    );
  });

  it('returns a real name as stored, surrounding spaces included', () => {
    expect(resolveAccountName(makeTestAccount({ name: '  CIB  ' }))).toBe('  CIB  ');
  });

  it('reads "Unknown account" for an id that did not resolve', () => {
    expect(resolveAccountName(undefined)).toBe(Strings.unknownAccount);
  });

  it('ships "Unnamed account" byte-exact', () => {
    expect(Strings.unnamedAccount).toBe('Unnamed account');
  });

  it('keeps the three fallbacks distinct', () => {
    expect(Strings.deletedAccount).not.toBe(Strings.unknownAccount);
    expect(Strings.unnamedAccount).not.toBe(Strings.unknownAccount);
    expect(Strings.unnamedAccount).not.toBe(Strings.deletedAccount);
  });
});
