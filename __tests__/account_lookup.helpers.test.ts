import {
  type AccountsByIdRead,
  dropCopiesReadBeforeDelete,
  findMissingAccountIds,
  getTransactionAccountIds,
  lookupLeavesUnresolved,
  readAccountsById,
} from '@/modules/accounts/store/account_lookup.helpers';
import { makeTestAccount, makeTestTransaction } from '@/test_helpers/transaction';

describe('readAccountsById', () => {
  it('lets the active list win over a cached row with the same id', () => {
    const cached = makeTestAccount({ id: 'a', name: 'Old name', is_archived: 1 });
    const active = makeTestAccount({ id: 'a', name: 'Restored name' });

    const merged = readAccountsById({
      accounts: [active],
      archivedAccounts: [],
      accountLookupById: { a: cached },
    });

    expect(merged.get('a')?.name).toBe('Restored name');
  });

  it('lets the archived list win over a cached row with the same id', () => {
    const cached = makeTestAccount({ id: 'a', name: 'Old name' });
    const archived = makeTestAccount({ id: 'a', name: 'Archived name', is_archived: 1 });

    const merged = readAccountsById({
      accounts: [],
      archivedAccounts: [archived],
      accountLookupById: { a: cached },
    });

    expect(merged.get('a')?.name).toBe('Archived name');
  });

  it('keeps a row only the cache holds', () => {
    const deleted = makeTestAccount({ id: 'gone', name: '', is_deleted: 1, is_archived: 1 });

    const merged = readAccountsById({
      accounts: [makeTestAccount({ id: 'a' })],
      archivedAccounts: [makeTestAccount({ id: 'b' })],
      accountLookupById: { gone: deleted },
    });

    expect([...merged.keys()].sort()).toEqual(['a', 'b', 'gone']);
    expect(merged.get('gone')).toBe(deleted);
  });

  it('yields an empty map from empty inputs', () => {
    expect(
      readAccountsById({ accounts: [], archivedAccounts: [], accountLookupById: {} }).size,
    ).toBe(0);
  });

  it('gives the active row over the archived row over the cached row of one id', () => {
    const cached = makeTestAccount({ id: 'a', name: 'Cached name' });
    const archived = makeTestAccount({ id: 'a', name: 'Archived name', is_archived: 1 });
    const active = makeTestAccount({ id: 'a', name: 'Active name' });

    expect(
      readAccountsById({
        accounts: [active],
        archivedAccounts: [archived],
        accountLookupById: { a: cached },
      }).get('a'),
    ).toBe(active);
    expect(
      readAccountsById({
        accounts: [],
        archivedAccounts: [archived],
        accountLookupById: { a: cached },
      }).get('a'),
    ).toBe(archived);
  });
});

describe('getTransactionAccountIds', () => {
  it('returns the source and the destination of a transfer', () => {
    const transfer = makeTestTransaction({ account_id: 'source', to_account_id: 'destination' });

    expect(getTransactionAccountIds(transfer)).toEqual(['source', 'destination']);
  });

  it('returns only the account of a transaction with no destination', () => {
    const expense = makeTestTransaction({ account_id: 'source', to_account_id: null });

    expect(getTransactionAccountIds(expense)).toEqual(['source']);
  });
});

describe('findMissingAccountIds', () => {
  it('returns the ids the map does not hold, in request order', () => {
    const accountsById = readAccountsById({
      accounts: [makeTestAccount({ id: 'a' })],
      archivedAccounts: [],
      accountLookupById: { c: makeTestAccount({ id: 'c' }) },
    });

    expect(findMissingAccountIds(['b', 'a', 'c', 'd'], accountsById)).toEqual(['b', 'd']);
  });

  it('returns nothing when the map holds every id', () => {
    const accountsById = readAccountsById({
      accounts: [makeTestAccount({ id: 'a' })],
      archivedAccounts: [],
      accountLookupById: {},
    });

    expect(findMissingAccountIds(['a'], accountsById)).toEqual([]);
  });
});

describe('dropCopiesReadBeforeDelete', () => {
  it('keeps the deleted row of a deleted id', () => {
    const deleted = makeTestAccount({ id: 'gone', name: '', is_deleted: 1, is_archived: 1 });

    expect(dropCopiesReadBeforeDelete([deleted], new Set(['gone']))).toEqual([deleted]);
  });

  it('drops the row of a deleted id that was read before its delete', () => {
    const copy = makeTestAccount({ id: 'gone', name: 'Before delete', is_archived: 1 });
    const active = makeTestAccount({ id: 'a' });

    expect(dropCopiesReadBeforeDelete([copy, active], new Set(['gone']))).toEqual([active]);
  });

  it('keeps active and archived rows of ids not in the set, in input order', () => {
    const archived = makeTestAccount({ id: 'b', is_archived: 1 });
    const active = makeTestAccount({ id: 'a' });
    const rows = [archived, active];

    const kept = dropCopiesReadBeforeDelete(rows, new Set(['gone']));

    expect(kept).toEqual([archived, active]);
    expect(kept).not.toBe(rows);
  });

  it('returns an empty array for no rows', () => {
    expect(dropCopiesReadBeforeDelete([], new Set(['gone']))).toEqual([]);
  });
});

describe('lookupLeavesUnresolved', () => {
  const accountsById = new Map([['a', makeTestAccount({ id: 'a' })]]);
  const failed: AccountsByIdRead = { accountsById, lookupFailed: true };

  it('is false for a missing id while the lookup has not failed', () => {
    expect(lookupLeavesUnresolved({ accountsById, lookupFailed: false }, ['a', 'missing'])).toBe(
      false,
    );
  });

  it('is false when the lookup failed and every id resolves', () => {
    expect(lookupLeavesUnresolved(failed, ['a'])).toBe(false);
  });

  it('is true when the lookup failed and one id is missing', () => {
    expect(lookupLeavesUnresolved(failed, ['a', 'missing'])).toBe(true);
  });

  it('is false for no ids', () => {
    expect(lookupLeavesUnresolved(failed, [])).toBe(false);
  });
});
