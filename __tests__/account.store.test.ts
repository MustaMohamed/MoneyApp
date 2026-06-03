import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';
import { AccountStore, EMPTY_ACCOUNTS } from '@/modules/accounts/store/account.store';
import type { IAccountRepository, NewAccountInput } from '@/repositories/account.repository';

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
    add: jest.fn().mockResolvedValue(mockAccount),
    update: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue(undefined),
    adjustBalance: jest.fn().mockResolvedValue(undefined),
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('accountStore.init', () => {
  it('starts with an empty account list', () => {
    const repo = makeRepo();
    const store = new AccountStore(repo);

    expect(store.accounts).toBe(EMPTY_ACCOUNTS);
  });

  it('calls repo.getAll and sets accounts in state', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = new AccountStore(repo);
    await store.init();
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.accounts).toEqual([mockAccount]);
  });

  it('propagates errors thrown by repo.getAll', async () => {
    const error = new Error('db error');
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(error) });
    const store = new AccountStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.init()).rejects.toThrow('db error');
    expect(consoleSpy).toHaveBeenCalledWith('[accountStore] init failed:', error);
    consoleSpy.mockRestore();
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
    const store = new AccountStore(repo);

    const firstRequest = store.init();
    const secondRequest = store.init();

    const newerAccount = { ...mockAccount, id: 'newer' };
    secondLoad.resolve([newerAccount]);
    await secondRequest;
    expect(store.accounts).toEqual([newerAccount]);

    const olderAccount = { ...mockAccount, id: 'older' };
    firstLoad.resolve([olderAccount]);
    await firstRequest;

    expect(store.accounts).toEqual([newerAccount]);
  });
});

describe('accountStore.addAccount', () => {
  it('delegates to repo.add with the provided input', async () => {
    const repo = makeRepo();
    const store = new AccountStore(repo);
    const result = await store.addAccount(baseInput);
    expect(repo.add).toHaveBeenCalledWith(baseInput);
    expect(result).toEqual(mockAccount);
  });

  it('reloads accounts state after adding', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = new AccountStore(repo);
    await store.addAccount(baseInput);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.accounts).toEqual([mockAccount]);
  });

  it('propagates errors thrown by repo.add', async () => {
    const error = new Error('insert failed');
    const repo = makeRepo({ add: jest.fn().mockRejectedValue(error) });
    const store = new AccountStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.addAccount(baseInput)).rejects.toThrow('insert failed');
    expect(consoleSpy).toHaveBeenCalledWith('[accountStore] addAccount failed:', error);
    consoleSpy.mockRestore();
  });
});

describe('accountStore.updateAccount', () => {
  it('delegates to repo.update with id and data', async () => {
    const repo = makeRepo();
    const store = new AccountStore(repo);
    await store.updateAccount('test-id', { name: 'New Name', color: '#C9973A' });
    expect(repo.update).toHaveBeenCalledWith('test-id', { name: 'New Name', color: '#C9973A' });
  });

  it('reloads accounts after updating', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = new AccountStore(repo);
    await store.updateAccount('test-id', { name: 'New Name', color: null });
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.accounts).toEqual([mockAccount]);
  });

  it('propagates errors from repo.update', async () => {
    const error = new Error('update failed');
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(error) });
    const store = new AccountStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.updateAccount('test-id', { name: 'x', color: null })).rejects.toThrow(
      'update failed',
    );
    expect(consoleSpy).toHaveBeenCalledWith('[accountStore] updateAccount failed:', error);
    consoleSpy.mockRestore();
  });
});

describe('accountStore.archiveAccount', () => {
  it('delegates to repo.archive with the account id', async () => {
    const repo = makeRepo();
    const store = new AccountStore(repo);
    await store.archiveAccount('test-id');
    expect(repo.archive).toHaveBeenCalledWith('test-id');
  });

  it('reloads accounts after archiving', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([]) });
    const store = new AccountStore(repo);
    await store.archiveAccount('test-id');
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from repo.archive', async () => {
    const error = new Error('archive failed');
    const repo = makeRepo({ archive: jest.fn().mockRejectedValue(error) });
    const store = new AccountStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.archiveAccount('test-id')).rejects.toThrow('archive failed');
    expect(consoleSpy).toHaveBeenCalledWith('[accountStore] archiveAccount failed:', error);
    consoleSpy.mockRestore();
  });
});

describe('accountStore.adjustBalance', () => {
  it('delegates to repo.adjustBalance with id and balance', async () => {
    const repo = makeRepo();
    const store = new AccountStore(repo);
    await store.adjustBalance('test-id', 9999);
    expect(repo.adjustBalance).toHaveBeenCalledWith('test-id', 9999);
  });

  it('reloads accounts after adjusting', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = new AccountStore(repo);
    await store.adjustBalance('test-id', 9999);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from repo.adjustBalance', async () => {
    const error = new Error('db error');
    const repo = makeRepo({
      adjustBalance: jest.fn().mockRejectedValue(error),
    });
    const store = new AccountStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.adjustBalance('test-id', 0)).rejects.toThrow('db error');
    expect(consoleSpy).toHaveBeenCalledWith('[accountStore] adjustBalance failed:', error);
    consoleSpy.mockRestore();
  });
});

describe('accountStore.reset', () => {
  it('restores the empty account list', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([{ ...mockAccount, id: 'a1' }]),
    });
    const store = new AccountStore(repo);
    await store.init();
    expect(store.accounts).toHaveLength(1);

    store.reset();

    expect(store.accounts).toBe(EMPTY_ACCOUNTS);
  });

  it('prevents pending loads from writing after reset', async () => {
    const load = deferred<Account[]>();
    const repo = makeRepo({ getAll: jest.fn().mockReturnValueOnce(load.promise) });
    const store = new AccountStore(repo);

    const request = store.init();
    store.reset();

    load.resolve([mockAccount]);
    await request;

    expect(store.accounts).toBe(EMPTY_ACCOUNTS);
  });
});

describe('EMPTY_ACCOUNTS', () => {
  it('is immutable', () => {
    expect(Object.isFrozen(EMPTY_ACCOUNTS)).toBe(true);
  });
});
