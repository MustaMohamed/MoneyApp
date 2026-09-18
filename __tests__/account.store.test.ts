import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';
import {
  createAccountStore,
  EMPTY_ACCOUNT_LOOKUP,
  EMPTY_ACCOUNTS,
} from '@/modules/accounts/store/account.store';
import type {
  IAccountRepository,
  NewAccountInput,
  UpdateAccountInput,
} from '@/repositories/account.repository';

const mockAccount: Account = {
  id: 'test-id',
  name: 'CIB Savings',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 5000,
  current_balance: 5000,
  color: '#1B2B4B',
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  balance_review_required: 0,
  is_deleted: 0,
  is_archived: 0,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const baseInput: NewAccountInput = {
  name: 'CIB Savings',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 5000,
  color: '#1B2B4B',
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  sort_order: 0,
};

function makeRepo(overrides: Partial<IAccountRepository> = {}): IAccountRepository {
  return {
    getAll: jest.fn().mockResolvedValue([]),
    getArchived: jest.fn().mockResolvedValue([]),
    getByIdIncludingArchived: jest.fn().mockResolvedValue(undefined),
    getByIdsIncludingArchived: jest.fn().mockResolvedValue([]),
    add: jest.fn().mockResolvedValue(mockAccount),
    update: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue(undefined),
    unarchive: jest.fn().mockResolvedValue(undefined),
    reorder: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    adjustBalance: jest.fn().mockResolvedValue(undefined),
    confirmBalanceReviewed: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('accountStore.loadAccountLookup', () => {
  const archivedA: Account = { ...mockAccount, id: 'archived-a', is_archived: 1 };
  const deletedB: Account = { ...mockAccount, id: 'deleted-b', name: '', is_deleted: 1 };

  it('keeps the rows of an earlier load when a later load resolves different ids', async () => {
    const repo = makeRepo({
      getByIdsIncludingArchived: jest
        .fn()
        .mockResolvedValueOnce([archivedA])
        .mockResolvedValueOnce([deletedB]),
    });
    const store = createAccountStore(repo);

    await store.getState().loadAccountLookup([archivedA.id, archivedA.id]);
    await store.getState().loadAccountLookup([deletedB.id]);

    expect(repo.getByIdsIncludingArchived).toHaveBeenNthCalledWith(1, [archivedA.id]);
    expect(repo.getByIdsIncludingArchived).toHaveBeenNthCalledWith(2, [deletedB.id]);
    expect(store.getState().accountLookupById).toEqual({
      [archivedA.id]: archivedA,
      [deletedB.id]: deletedB,
    });
    expect(store.getState().accounts).toBe(EMPTY_ACCOUNTS);
  });

  it('makes no query for ids the active list, the archived list or the cache already hold', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([mockAccount]),
      getArchived: jest.fn().mockResolvedValue([archivedA]),
      getByIdsIncludingArchived: jest.fn().mockResolvedValue([deletedB]),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();
    await store.getState().loadAccountLookup([deletedB.id]);
    const cached = store.getState().accountLookupById;

    await store.getState().loadAccountLookup([mockAccount.id, archivedA.id, deletedB.id]);

    expect(repo.getByIdsIncludingArchived).toHaveBeenCalledTimes(1);
    expect(store.getState().accountLookupById).toBe(cached);
  });

  it('queries nothing and removes nothing when no ids are requested', async () => {
    const repo = makeRepo({
      getByIdsIncludingArchived: jest.fn().mockResolvedValue([deletedB]),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccountLookup([deletedB.id]);
    const cached = store.getState().accountLookupById;

    await store.getState().loadAccountLookup([]);

    expect(repo.getByIdsIncludingArchived).toHaveBeenCalledTimes(1);
    expect(store.getState().accountLookupById).toBe(cached);
    expect(cached).toEqual({ [deletedB.id]: deletedB });
  });

  it('discards a lookup that started before the latest account reload', async () => {
    const lookup = deferred<Account[]>();
    const repo = makeRepo({
      getByIdsIncludingArchived: jest.fn().mockReturnValueOnce(lookup.promise),
    });
    const store = createAccountStore(repo);

    const request = store.getState().loadAccountLookup([deletedB.id]);
    await store.getState().loadAccounts();
    lookup.resolve([deletedB]);
    await request;

    expect(repo.getByIdsIncludingArchived).toHaveBeenCalledTimes(1);
    expect(store.getState().accountLookupById).toBe(EMPTY_ACCOUNT_LOOKUP);
  });

  it('sets the error on a failed lookup and clears it when the retry queries', async () => {
    const failure = new Error('lookup failed');
    const retryLookup = deferred<Account[]>();
    const repo = makeRepo({
      getByIdsIncludingArchived: jest
        .fn()
        .mockRejectedValueOnce(failure)
        .mockReturnValueOnce(retryLookup.promise),
    });
    const store = createAccountStore(repo);

    await expect(store.getState().loadAccountLookup([deletedB.id])).rejects.toBe(failure);
    expect(store.getState().accountLookupError).toBe(true);

    const retry = store.getState().loadAccountLookup([deletedB.id]);
    expect(store.getState().accountLookupError).toBe(false);
    expect(repo.getByIdsIncludingArchived).toHaveBeenCalledTimes(2);

    retryLookup.resolve([deletedB]);
    await retry;

    expect(store.getState().accountLookupError).toBe(false);
    expect(store.getState().accountLookupById).toEqual({ [deletedB.id]: deletedB });
  });

  it('keeps the error up until a load queries every id whose failure is outstanding', async () => {
    const deletedE: Account = { ...mockAccount, id: 'deleted-e', name: '', is_deleted: 1 };
    const failure = new Error('lookup failed');
    const retryLookup = deferred<Account[]>();
    const repo = makeRepo({
      getByIdsIncludingArchived: jest
        .fn()
        .mockRejectedValueOnce(failure)
        .mockResolvedValueOnce([deletedE])
        .mockReturnValueOnce(retryLookup.promise),
    });
    const store = createAccountStore(repo);
    await expect(store.getState().loadAccountLookup([deletedB.id, deletedE.id])).rejects.toBe(
      failure,
    );

    await store.getState().loadAccountLookup([deletedE.id]);

    expect(repo.getByIdsIncludingArchived).toHaveBeenNthCalledWith(2, [deletedE.id]);
    expect(store.getState().accountLookupError).toBe(true);

    const retry = store.getState().loadAccountLookup([deletedB.id]);
    expect(repo.getByIdsIncludingArchived).toHaveBeenNthCalledWith(3, [deletedB.id]);
    expect(store.getState().accountLookupError).toBe(false);

    retryLookup.resolve([deletedB]);
    await retry;

    expect(store.getState().accountLookupError).toBe(false);
  });

  it('does not hold the error up for a failed id the lists have resolved since', async () => {
    const repo = makeRepo({
      getArchived: jest.fn().mockResolvedValue([archivedA]),
      getByIdsIncludingArchived: jest
        .fn()
        .mockRejectedValueOnce(new Error('lookup failed'))
        .mockResolvedValueOnce([deletedB]),
    });
    const store = createAccountStore(repo);
    await expect(store.getState().loadAccountLookup([archivedA.id, deletedB.id])).rejects.toThrow();
    await store.getState().loadAccounts();

    const retry = store.getState().loadAccountLookup([archivedA.id, deletedB.id]);
    expect(repo.getByIdsIncludingArchived).toHaveBeenNthCalledWith(2, [deletedB.id]);
    expect(store.getState().accountLookupError).toBe(false);
    await retry;

    expect(store.getState().accountLookupError).toBe(false);
  });

  it('forgets the failed ids on reset', async () => {
    const deletedE: Account = { ...mockAccount, id: 'deleted-e', name: '', is_deleted: 1 };
    const repo = makeRepo({
      getByIdsIncludingArchived: jest
        .fn()
        .mockRejectedValueOnce(new Error('before reset'))
        .mockRejectedValueOnce(new Error('after reset'))
        .mockResolvedValueOnce([deletedE]),
    });
    const store = createAccountStore(repo);
    await expect(store.getState().loadAccountLookup([deletedB.id])).rejects.toThrow();
    store.getState().reset();
    await expect(store.getState().loadAccountLookup([deletedE.id])).rejects.toThrow();

    await store.getState().loadAccountLookup([deletedE.id]);

    expect(store.getState().accountLookupError).toBe(false);
  });

  it('leaves the error up on a load that queries nothing', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([mockAccount]),
      getByIdsIncludingArchived: jest.fn().mockRejectedValueOnce(new Error('lookup failed')),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();
    await expect(store.getState().loadAccountLookup([deletedB.id])).rejects.toThrow();

    await store.getState().loadAccountLookup([mockAccount.id]);
    await store.getState().loadAccountLookup([]);

    expect(repo.getByIdsIncludingArchived).toHaveBeenCalledTimes(1);
    expect(store.getState().accountLookupError).toBe(true);
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('accountStore.loadAccounts', () => {
  it('starts with an empty account list', () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);

    expect(store.getState().accounts).toBe(EMPTY_ACCOUNTS);
    expect(store.getState().archivedAccounts).toBe(EMPTY_ACCOUNTS);
    expect(store.getState().accountLookupById).toBe(EMPTY_ACCOUNT_LOOKUP);
    expect(store.getState().accountLookupError).toBe(false);
    expect(store.getState().archivedCount).toBe(0);
    expect(store.getState().hasLoaded).toBe(false);
    expect(store.getState().loadError).toBe(false);
  });

  it('publishes the archived list alongside the active one, in one pass', async () => {
    const archived: Account = { ...mockAccount, id: 'archived', is_archived: 1 };
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([mockAccount]),
      getArchived: jest.fn().mockResolvedValue([archived]),
    });
    const store = createAccountStore(repo);

    await store.getState().loadAccounts();

    expect(repo.getArchived).toHaveBeenCalledTimes(1);
    expect(store.getState().archivedAccounts).toEqual([archived]);
    expect(store.getState().accounts).toEqual([mockAccount]);
  });

  it('sets loadError and keeps every slot when the archived list rejects', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([mockAccount]),
      getArchived: jest.fn().mockRejectedValue(new Error('archived list failed')),
    });
    const store = createAccountStore(repo);

    await expect(store.getState().loadAccounts()).rejects.toThrow('archived list failed');

    expect(store.getState().loadError).toBe(true);
    expect(store.getState().accounts).toBe(EMPTY_ACCOUNTS);
    expect(store.getState().archivedAccounts).toBe(EMPTY_ACCOUNTS);
    expect(store.getState().archivedCount).toBe(0);
    expect(store.getState().hasLoaded).toBe(false);
  });

  it('publishes the archived count as the length of the archived list', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([mockAccount]),
      getArchived: jest.fn().mockResolvedValue([
        { ...mockAccount, id: 'archived-1', is_archived: 1 },
        { ...mockAccount, id: 'archived-2', is_archived: 1 },
      ]),
    });
    const store = createAccountStore(repo);

    await store.getState().loadAccounts();

    expect(repo.getArchived).toHaveBeenCalledTimes(1);
    expect(store.getState().archivedCount).toBe(2);
  });

  it('calls repo.getAll and sets accounts in state', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.getState().accounts).toEqual([mockAccount]);
    expect(store.getState().hasLoaded).toBe(true);
  });

  it('propagates errors thrown by repo.getAll', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('db error')) });
    const store = createAccountStore(repo);
    await expect(store.getState().loadAccounts()).rejects.toThrow('db error');
    expect(store.getState().loadError).toBe(true);
  });

  it('clears a previous load error when retry succeeds', async () => {
    const repo = makeRepo({
      getAll: jest
        .fn()
        .mockRejectedValueOnce(new Error('db error'))
        .mockResolvedValueOnce([mockAccount]),
    });
    const store = createAccountStore(repo);

    await expect(store.getState().loadAccounts()).rejects.toThrow('db error');
    await store.getState().loadAccounts();

    expect(store.getState()).toMatchObject({
      accounts: [mockAccount],
      hasLoaded: true,
      loadError: false,
    });
  });

  it('keeps loadError up while the reload after a failure is in flight', async () => {
    const secondLoad = deferred<Account[]>();
    const repo = makeRepo({
      getAll: jest
        .fn()
        .mockRejectedValueOnce(new Error('db error'))
        .mockReturnValueOnce(secondLoad.promise),
    });
    const store = createAccountStore(repo);

    await expect(store.getState().loadAccounts()).rejects.toThrow('db error');
    const retry = store.getState().loadAccounts();
    expect(store.getState().loadError).toBe(true);

    secondLoad.resolve([mockAccount]);
    await retry;

    expect(store.getState()).toMatchObject({
      accounts: [mockAccount],
      hasLoaded: true,
      loadError: false,
    });
  });

  it('a failed reload keeps the rows already loaded', async () => {
    const repo = makeRepo({
      getAll: jest
        .fn()
        .mockResolvedValueOnce([mockAccount])
        .mockRejectedValueOnce(new Error('db error')),
    });
    const store = createAccountStore(repo);

    await store.getState().loadAccounts();
    await expect(store.getState().loadAccounts()).rejects.toThrow('db error');

    expect(store.getState()).toMatchObject({
      accounts: [mockAccount],
      hasLoaded: true,
      loadError: true,
    });
    expect(repo.getAll).toHaveBeenCalledTimes(2);
    expect(repo.add).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.adjustBalance).not.toHaveBeenCalled();
  });

  it('does not let an older load overwrite a newer load result', async () => {
    const firstLoad = deferred<Account[]>();
    const secondLoad = deferred<Account[]>();
    const repo = makeRepo({
      getAll: jest
        .fn()
        .mockReturnValueOnce(firstLoad.promise)
        .mockReturnValueOnce(secondLoad.promise),
    });
    const store = createAccountStore(repo);

    const firstRequest = store.getState().loadAccounts();
    const secondRequest = store.getState().loadAccounts();

    const newerAccount = { ...mockAccount, id: 'newer' };
    secondLoad.resolve([newerAccount]);
    await secondRequest;
    expect(store.getState().accounts).toEqual([newerAccount]);
    expect(store.getState().hasLoaded).toBe(true);

    const olderAccount = { ...mockAccount, id: 'older' };
    firstLoad.resolve([olderAccount]);
    await firstRequest;

    expect(store.getState().accounts).toEqual([newerAccount]);
  });

  it('does not let an older load publish its archived list or count either', async () => {
    const firstLoad = deferred<Account[]>();
    const secondLoad = deferred<Account[]>();
    const stale: Account = { ...mockAccount, id: 'stale-archived', is_archived: 1 };
    const staler: Account = { ...mockAccount, id: 'staler-archived', is_archived: 1 };
    const fresh: Account = { ...mockAccount, id: 'fresh-archived', is_archived: 1 };
    const repo = makeRepo({
      getAll: jest
        .fn()
        .mockReturnValueOnce(firstLoad.promise)
        .mockReturnValueOnce(secondLoad.promise),
      getArchived: jest.fn().mockResolvedValueOnce([stale, staler]).mockResolvedValueOnce([fresh]),
    });
    const store = createAccountStore(repo);

    const firstRequest = store.getState().loadAccounts();
    const secondRequest = store.getState().loadAccounts();

    secondLoad.resolve([]);
    await secondRequest;
    expect(store.getState().archivedAccounts).toEqual([fresh]);
    expect(store.getState().archivedCount).toBe(1);

    firstLoad.resolve([mockAccount]);
    await firstRequest;

    expect(store.getState().archivedAccounts).toEqual([fresh]);
    expect(store.getState().archivedCount).toBe(1);
  });
});

describe('accountStore.addAccount', () => {
  it('delegates to repo.add with the provided input', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    const result = await store.getState().addAccount(baseInput);
    expect(repo.add).toHaveBeenCalledWith(baseInput);
    expect(result).toEqual(mockAccount);
  });

  it('reloads accounts state after adding', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = createAccountStore(repo);
    await store.getState().addAccount(baseInput);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.getState().accounts).toEqual([mockAccount]);
    expect(store.getState().hasLoaded).toBe(true);
  });

  it('propagates errors thrown by repo.add', async () => {
    const repo = makeRepo({ add: jest.fn().mockRejectedValue(new Error('insert failed')) });
    const store = createAccountStore(repo);
    await expect(store.getState().addAccount(baseInput)).rejects.toThrow('insert failed');
    expect(repo.getAll).not.toHaveBeenCalled();
  });

  it('resolves when the write lands and only the reload after it fails', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('reload failed')) });
    const store = createAccountStore(repo);

    await expect(store.getState().addAccount(baseInput)).resolves.toEqual(mockAccount);

    expect(repo.add).toHaveBeenCalledWith(baseInput);
    expect(store.getState().loadError).toBe(true);
  });
});

describe('accountStore.updateAccount', () => {
  const change: UpdateAccountInput = {
    name: 'New Name',
    color: '#C9973A',
    credit_limit: 7000,
    minimum_payment: 700,
    statement_due_day: 20,
    interest_tracking: 1,
    apr: 24.99,
  };

  it('delegates to repo.update with id and exactly the seven-field payload', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    await store.getState().updateAccount('test-id', change);
    expect(jest.mocked(repo.update).mock.calls).toEqual([['test-id', change]]);
  });

  it('reloads accounts after updating', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = createAccountStore(repo);
    await store.getState().updateAccount('test-id', { ...change, color: null });
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.getState().accounts).toEqual([mockAccount]);
  });

  it('propagates errors from repo.update', async () => {
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(new Error('update failed')) });
    const store = createAccountStore(repo);
    await expect(
      store.getState().updateAccount('test-id', { ...change, name: 'x', color: null }),
    ).rejects.toThrow('update failed');
    expect(repo.getAll).not.toHaveBeenCalled();
  });

  it('resolves when the write lands and only the reload after it fails', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('reload failed')) });
    const store = createAccountStore(repo);

    await expect(
      store.getState().updateAccount('test-id', { ...change, color: null }),
    ).resolves.toBeUndefined();

    expect(repo.update).toHaveBeenCalledWith('test-id', { ...change, color: null });
    expect(store.getState().loadError).toBe(true);
  });
});

describe('accountStore.archiveAccount', () => {
  it('delegates to repo.archive with the account id', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    await store.getState().archiveAccount('test-id');
    expect(repo.archive).toHaveBeenCalledWith('test-id');
  });

  it('reloads accounts after archiving', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([]) });
    const store = createAccountStore(repo);
    await store.getState().archiveAccount('test-id');
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('publishes the archived count the post-archive reload returns', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValueOnce([mockAccount]).mockResolvedValueOnce([]),
      getArchived: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...mockAccount, is_archived: 1 }]),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();
    expect(store.getState().archivedCount).toBe(0);

    await store.getState().archiveAccount('test-id');

    expect(store.getState().accounts).toEqual([]);
    expect(store.getState().archivedCount).toBe(1);
  });

  it('propagates errors from repo.archive', async () => {
    const repo = makeRepo({ archive: jest.fn().mockRejectedValue(new Error('archive failed')) });
    const store = createAccountStore(repo);
    await expect(store.getState().archiveAccount('test-id')).rejects.toThrow('archive failed');
  });

  it('resolves when the write lands and only the reload after it fails', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('reload failed')) });
    const store = createAccountStore(repo);

    await expect(store.getState().archiveAccount('test-id')).resolves.toBeUndefined();

    expect(repo.archive).toHaveBeenCalledWith('test-id');
    expect(store.getState().loadError).toBe(true);
  });
});

describe('accountStore.unarchiveAccount', () => {
  it('delegates to repo.unarchive and republishes all three slots', async () => {
    const archived: Account = { ...mockAccount, id: 'archived', is_archived: 1 };
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([mockAccount]),
      getArchived: jest.fn().mockResolvedValueOnce([archived]).mockResolvedValueOnce([]),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();
    expect(store.getState().archivedAccounts).toEqual([archived]);

    await store.getState().unarchiveAccount('archived');

    expect(repo.unarchive).toHaveBeenCalledWith('archived');
    expect(store.getState().accounts).toEqual([mockAccount]);
    expect(store.getState().archivedAccounts).toEqual([]);
    expect(store.getState().archivedCount).toBe(0);
  });

  it('rejects with the repository error and leaves every loaded slot alone', async () => {
    const archived: Account = { ...mockAccount, id: 'archived', is_archived: 1 };
    const failure = new Error('unarchive failed');
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([mockAccount]),
      getArchived: jest.fn().mockResolvedValue([archived]),
      unarchive: jest.fn().mockRejectedValue(failure),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();

    await expect(store.getState().unarchiveAccount('archived')).rejects.toBe(failure);

    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(repo.getArchived).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({
      accounts: [mockAccount],
      archivedAccounts: [archived],
      archivedCount: 1,
      loadError: false,
    });
  });

  it('resolves when the write lands and only the reload after it fails', async () => {
    const archived: Account = { ...mockAccount, id: 'archived', is_archived: 1 };
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('reload failed')),
      getArchived: jest.fn().mockResolvedValue([archived]),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();

    await expect(store.getState().unarchiveAccount('archived')).resolves.toBeUndefined();

    expect(repo.unarchive).toHaveBeenCalledWith('archived');
    expect(store.getState().loadError).toBe(true);
    expect(store.getState().archivedAccounts).toEqual([archived]);
  });
});

describe('accountStore.reorderAccounts', () => {
  const first: Account = { ...mockAccount, id: 'first', name: 'First', sort_order: 0 };
  const second: Account = { ...mockAccount, id: 'second', name: 'Second', sort_order: 1 };
  const third: Account = { ...mockAccount, id: 'third', name: 'Third', sort_order: 2 };

  it('delegates to repo.reorder with the ids and publishes the list the reload reads', async () => {
    const reordered = [
      { ...second, sort_order: 0 },
      { ...first, sort_order: 1 },
    ];
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValueOnce([first, second]).mockResolvedValueOnce(reordered),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();

    await expect(store.getState().reorderAccounts(['second', 'first'])).resolves.toBeUndefined();

    expect(repo.reorder).toHaveBeenCalledWith(['second', 'first']);
    expect(repo.getAll).toHaveBeenCalledTimes(2);
    expect(store.getState().accounts).toEqual(reordered);
    expect(store.getState().loadError).toBe(false);
  });

  it('rejects with the repository error after re-reading the saved order', async () => {
    const failure = new Error('reorder refused');
    const saved = [first, second, third];
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValueOnce([first, second]).mockResolvedValueOnce(saved),
      reorder: jest.fn().mockRejectedValue(failure),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();

    await expect(store.getState().reorderAccounts(['second', 'first'])).rejects.toBe(failure);

    expect(repo.getAll).toHaveBeenCalledTimes(2);
    expect(store.getState().accounts).toEqual(saved);
    expect(store.getState().loadError).toBe(false);
  });

  it('resolves when the write lands and only the reload after it fails', async () => {
    const repo = makeRepo({
      getAll: jest
        .fn()
        .mockResolvedValueOnce([first, second])
        .mockRejectedValueOnce(new Error('reload failed')),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();

    await expect(store.getState().reorderAccounts(['second', 'first'])).resolves.toBeUndefined();

    expect(repo.reorder).toHaveBeenCalledWith(['second', 'first']);
    expect(store.getState().loadError).toBe(true);
  });

  it('rejects with the write error, not the reload error, when both fail', async () => {
    const writeFailure = new Error('reorder failed');
    const repo = makeRepo({
      getAll: jest
        .fn()
        .mockResolvedValueOnce([first, second])
        .mockRejectedValueOnce(new Error('reload failed')),
      reorder: jest.fn().mockRejectedValue(writeFailure),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();

    await expect(store.getState().reorderAccounts(['second', 'first'])).rejects.toBe(writeFailure);

    expect(repo.getAll).toHaveBeenCalledTimes(2);
    expect(store.getState().loadError).toBe(true);
  });
});

describe('accountStore.deleteAccount', () => {
  const deletedRow: Account = { ...mockAccount, is_archived: 1, is_deleted: 1, name: '' };

  it('delegates to repo.delete with the account id', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    await store.getState().deleteAccount('test-id');
    expect(repo.delete).toHaveBeenCalledWith('test-id');
  });

  it('reloads both lists once after deleting', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    await store.getState().deleteAccount('test-id');
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(repo.getArchived).toHaveBeenCalledTimes(1);
  });

  it('propagates a failed delete and reads nothing after it', async () => {
    const failure = new Error('delete failed');
    const repo = makeRepo({ delete: jest.fn().mockRejectedValue(failure) });
    const store = createAccountStore(repo);

    await expect(store.getState().deleteAccount('test-id')).rejects.toBe(failure);

    expect(repo.getAll).not.toHaveBeenCalled();
    expect(repo.getByIdsIncludingArchived).not.toHaveBeenCalled();
  });

  it('resolves when the write lands and only the reload after it fails', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('reload failed')) });
    const store = createAccountStore(repo);

    await expect(store.getState().deleteAccount('test-id')).resolves.toBeUndefined();

    expect(repo.delete).toHaveBeenCalledWith('test-id');
    expect(store.getState().loadError).toBe(true);
  });

  it('publishes the deleted row to the lookup, so a mounted list reads Deleted Account', async () => {
    const repo = makeRepo({
      getByIdsIncludingArchived: jest.fn().mockResolvedValue([deletedRow]),
    });
    const store = createAccountStore(repo);

    await store.getState().deleteAccount('test-id');

    expect(repo.getByIdsIncludingArchived).toHaveBeenCalledWith(['test-id']);
    expect(store.getState().accountLookupById['test-id']?.is_deleted).toBe(1);
  });

  it('drops a cached copy before the lookup, so the pre-delete row does not stay known', async () => {
    const repo = makeRepo({
      getByIdsIncludingArchived: jest
        .fn()
        .mockResolvedValueOnce([mockAccount])
        .mockResolvedValueOnce([deletedRow]),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccountLookup(['test-id']);
    expect(store.getState().accountLookupById['test-id']?.is_deleted).toBe(0);

    await store.getState().deleteAccount('test-id');

    expect(repo.getByIdsIncludingArchived).toHaveBeenCalledTimes(2);
    expect(repo.getByIdsIncludingArchived).toHaveBeenLastCalledWith(['test-id']);
    expect(store.getState().accountLookupById['test-id']?.is_deleted).toBe(1);
  });
});

describe('accountStore.deleteAccountMovingCommitments', () => {
  const deletedRow: Account = { ...mockAccount, is_archived: 1, is_deleted: 1, name: '' };

  it('delegates to repo.delete with the account id and the replacement id', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    await store.getState().deleteAccountMovingCommitments('test-id', 'replacement-id');
    expect(repo.delete).toHaveBeenCalledWith('test-id', 'replacement-id');
  });

  it('reloads both lists once after the move and delete', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    await store.getState().deleteAccountMovingCommitments('test-id', 'replacement-id');
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(repo.getArchived).toHaveBeenCalledTimes(1);
  });

  it('propagates a failed write and reads nothing after it', async () => {
    const failure = new Error('move failed');
    const repo = makeRepo({ delete: jest.fn().mockRejectedValue(failure) });
    const store = createAccountStore(repo);

    await expect(
      store.getState().deleteAccountMovingCommitments('test-id', 'replacement-id'),
    ).rejects.toBe(failure);

    expect(repo.getAll).not.toHaveBeenCalled();
    expect(repo.getByIdsIncludingArchived).not.toHaveBeenCalled();
  });

  it('publishes the deleted row to the lookup', async () => {
    const repo = makeRepo({
      getByIdsIncludingArchived: jest.fn().mockResolvedValue([deletedRow]),
    });
    const store = createAccountStore(repo);

    await store.getState().deleteAccountMovingCommitments('test-id', 'replacement-id');

    expect(repo.getByIdsIncludingArchived).toHaveBeenCalledWith(['test-id']);
    expect(store.getState().accountLookupById['test-id']?.is_deleted).toBe(1);
  });
});

describe('accountStore.adjustBalance', () => {
  it('delegates to repo.adjustBalance with id and balance', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    await store.getState().adjustBalance('test-id', 9999);
    expect(repo.adjustBalance).toHaveBeenCalledWith('test-id', 9999);
  });

  it('reloads accounts after adjusting', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = createAccountStore(repo);
    await store.getState().adjustBalance('test-id', 9999);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from repo.adjustBalance', async () => {
    const repo = makeRepo({
      adjustBalance: jest.fn().mockRejectedValue(new Error('db error')),
    });
    const store = createAccountStore(repo);
    await expect(store.getState().adjustBalance('test-id', 0)).rejects.toThrow('db error');
    expect(repo.getAll).not.toHaveBeenCalled();
  });

  it('resolves when the write lands and only the reload after it fails', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('reload failed')) });
    const store = createAccountStore(repo);

    await expect(store.getState().adjustBalance('test-id', 9999)).resolves.toBeUndefined();

    expect(repo.adjustBalance).toHaveBeenCalledWith('test-id', 9999);
    expect(store.getState().loadError).toBe(true);
  });
});

describe('accountStore.confirmBalanceReviewed', () => {
  it('delegates to the repository and reloads accounts', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = createAccountStore(repo);

    await store.getState().confirmBalanceReviewed('test-id');

    expect(repo.confirmBalanceReviewed).toHaveBeenCalledWith('test-id');
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('keeps the current state and propagates repository failures', async () => {
    const repo = makeRepo({
      confirmBalanceReviewed: jest.fn().mockRejectedValue(new Error('db error')),
    });
    const store = createAccountStore(repo);

    await expect(store.getState().confirmBalanceReviewed('test-id')).rejects.toThrow('db error');
    expect(repo.getAll).not.toHaveBeenCalled();
  });

  it('resolves when the write lands and only the reload after it fails', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('reload failed')) });
    const store = createAccountStore(repo);

    await expect(store.getState().confirmBalanceReviewed('test-id')).resolves.toBeUndefined();

    expect(repo.confirmBalanceReviewed).toHaveBeenCalledWith('test-id');
    expect(store.getState().loadError).toBe(true);
  });
});

describe('accountStore.reset', () => {
  it('restores the empty account lists and a zero archived count', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([{ ...mockAccount, id: 'a1' }]),
      getArchived: jest.fn().mockResolvedValue([{ ...mockAccount, id: 'a2', is_archived: 1 }]),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();
    expect(store.getState().accounts).toHaveLength(1);
    expect(store.getState().archivedAccounts).toHaveLength(1);
    expect(store.getState().archivedCount).toBe(1);
    expect(store.getState().hasLoaded).toBe(true);

    store.getState().reset();

    expect(store.getState().accounts).toBe(EMPTY_ACCOUNTS);
    expect(store.getState().archivedAccounts).toBe(EMPTY_ACCOUNTS);
    expect(store.getState().archivedCount).toBe(0);
    expect(store.getState().hasLoaded).toBe(false);
  });

  it('empties the lookup cache and clears the lookup error', async () => {
    const deleted: Account = { ...mockAccount, id: 'deleted', is_deleted: 1 };
    const repo = makeRepo({
      getByIdsIncludingArchived: jest
        .fn()
        .mockResolvedValueOnce([deleted])
        .mockRejectedValueOnce(new Error('lookup failed')),
    });
    const store = createAccountStore(repo);
    await store.getState().loadAccountLookup([deleted.id]);
    await expect(store.getState().loadAccountLookup(['missing'])).rejects.toThrow();
    expect(store.getState().accountLookupError).toBe(true);

    store.getState().reset();

    expect(store.getState().accountLookupById).toBe(EMPTY_ACCOUNT_LOOKUP);
    expect(store.getState().accountLookupError).toBe(false);
  });

  it('prevents pending loads from writing after reset', async () => {
    const load = deferred<Account[]>();
    const repo = makeRepo({ getAll: jest.fn().mockReturnValueOnce(load.promise) });
    const store = createAccountStore(repo);

    const request = store.getState().loadAccounts();
    store.getState().reset();

    load.resolve([mockAccount]);
    await request;

    expect(store.getState().accounts).toBe(EMPTY_ACCOUNTS);
    expect(store.getState().hasLoaded).toBe(false);
  });
});

describe('EMPTY_ACCOUNTS', () => {
  it('is immutable', () => {
    expect(Object.isFrozen(EMPTY_ACCOUNTS)).toBe(true);
  });
});
