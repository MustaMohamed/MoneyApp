import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import type {
  ITransactionRepository,
  NewTransactionInput,
  TransactionListQuery,
  UpdateTransactionInput,
} from '@/modules/transactions/repositories/transaction.repository';
import { getTransactionQueryKey } from '@/modules/transactions/store/transaction_query.helpers';
import { useTransactionStore } from '@/store/transaction.store';
import { createTransactionStore, PAGE_SIZE } from '@/store/transaction.store';

const NOW = '2026-05-01T12:00:00.000Z';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? 'tx',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat_food',
    budget_id: null,
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
    revolving_balance_delta: overrides.revolving_balance_delta ?? null,
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeRepo(initial: Transaction[] = []): ITransactionRepository {
  let store = [...initial];
  return {
    getAll: jest.fn(async (query: TransactionListQuery = {}) => {
      let rows = store;
      if (query.type) rows = rows.filter((t) => t.type === query.type);
      const limit = query.limit ?? 30;
      const offset = query.offset ?? 0;
      return rows.slice(offset, offset + limit);
    }),
    getByAccount: jest.fn(async () => []),
    getById: jest.fn(async (id) => store.find((t) => t.id === id) ?? null),
    add: jest.fn(async (data: NewTransactionInput) => {
      const tx = makeTransaction({ id: 'tx-new', ...data });
      store = [tx, ...store];
      return tx;
    }),
    delete: jest.fn(async (id: string) => {
      store = store.filter((t) => t.id !== id);
    }),
    update: jest.fn(async (id: string, data: UpdateTransactionInput) => {
      const idx = store.findIndex((t) => t.id === id);
      if (idx >= 0) {
        store[idx] = {
          ...store[idx],
          amount: data.amount,
          currency: data.currency,
          egp_amount: data.egp_amount,
          exchange_rate: data.exchange_rate ?? null,
          category_id: data.category_id ?? null,
          note: data.note ?? null,
          transaction_date: data.transaction_date,
          transaction_time: data.transaction_time,
        };
      }
    }),
  };
}

describe('transactionStore.setQuery', () => {
  it('immediately assigns ownership to the new query and clears the old snapshot', async () => {
    const repo = makeRepo([makeTransaction({ id: 'old' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({ search: 'old' });

    const nextPage = deferred<Transaction[]>();
    repo.getAll = jest.fn(() => nextPage.promise);
    const nextQuery = { search: 'new' };
    const pending = useStore.getState().setQuery(nextQuery);

    expect(useStore.getState()).toMatchObject({
      transactions: [],
      query: nextQuery,
      queryKey: getTransactionQueryKey(nextQuery),
      snapshotKey: undefined,
      status: 'initialLoading',
    });

    nextPage.resolve([makeTransaction({ id: 'new' })]);
    await pending;
    expect(useStore.getState()).toMatchObject({
      snapshotKey: getTransactionQueryKey(nextQuery),
      status: 'ready',
    });
  });

  it('resolves an empty first page to the explicit empty state', async () => {
    const useStore = createTransactionStore(makeRepo());

    await useStore.getState().setQuery({});

    expect(useStore.getState().status).toBe('empty');
  });

  it('exposes a retryable first-load error without converting it to empty data', async () => {
    const repo = makeRepo();
    repo.getAll = jest
      .fn()
      .mockRejectedValueOnce(new Error('db unavailable'))
      .mockResolvedValue([]);
    const useStore = createTransactionStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(useStore.getState().setQuery({ search: 'rent' })).rejects.toThrow(
      'db unavailable',
    );
    expect(useStore.getState()).toMatchObject({
      transactions: [],
      snapshotKey: undefined,
      status: 'firstLoadError',
    });

    await useStore.getState().retry();
    expect(useStore.getState()).toMatchObject({
      snapshotKey: getTransactionQueryKey({ search: 'rent' }),
      status: 'empty',
    });
    consoleSpy.mockRestore();
  });

  it('starts idle so screens do not show empty states before the first fetch settles', () => {
    const repo = makeRepo();
    const useStore = createTransactionStore(repo);

    expect(useStore.getState()).toMatchObject({
      status: 'idle',
      snapshotKey: undefined,
    });
  });

  it('owns the resolved snapshot after the first fetch settles', async () => {
    const repo = makeRepo();
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});

    expect(useStore.getState()).toMatchObject({
      status: 'empty',
      snapshotKey: getTransactionQueryKey({}),
    });
  });

  it('replaces the list with the page-1 result for the new query', async () => {
    const txs = Array.from({ length: 5 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    expect(useStore.getState().transactions).toHaveLength(5);
    expect(useStore.getState().query).toEqual({});
  });

  it('sets hasMore=true at exactly PAGE_SIZE rows', async () => {
    const txs = Array.from({ length: PAGE_SIZE }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().hasMore).toBe(true);
  });

  it('sets hasMore=false when fewer than PAGE_SIZE rows return', async () => {
    const repo = makeRepo([makeTransaction({ id: 't1' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().hasMore).toBe(false);
  });

  it('moves from initial loading to empty on completion', async () => {
    const repo = makeRepo();
    const def = deferred<Transaction[]>();
    repo.getAll = jest.fn(() => def.promise);
    const useStore = createTransactionStore(repo);

    const inFlight = useStore.getState().setQuery({});
    expect(useStore.getState().status).toBe('initialLoading');
    def.resolve([]);
    await inFlight;
    expect(useStore.getState().status).toBe('empty');
  });
});

describe('transactionStore.loadMore', () => {
  it('does not advance the replacement request id while appending a page', async () => {
    const txs = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const useStore = createTransactionStore(makeRepo(txs));

    await useStore.getState().setQuery({});
    const replacementRequestId = useStore.getState().replacementRequestId;

    expect(replacementRequestId).toBeGreaterThan(0);
    await useStore.getState().loadMore();
    expect(useStore.getState().replacementRequestId).toBe(replacementRequestId);
  });

  it('appends the next page and bumps the offset', async () => {
    const txs = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    expect(useStore.getState().transactions).toHaveLength(PAGE_SIZE);
    await useStore.getState().loadMore();
    expect(useStore.getState().transactions).toHaveLength(PAGE_SIZE + 5);
    expect(useStore.getState().hasMore).toBe(false);
    expect(repo.getAll).toHaveBeenLastCalledWith({ limit: PAGE_SIZE, offset: PAGE_SIZE });
  });

  it('is a no-op when hasMore is false', async () => {
    const repo = makeRepo([makeTransaction({ id: 't1' })]);
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    (repo.getAll as jest.Mock).mockClear();
    await useStore.getState().loadMore();
    expect(repo.getAll).not.toHaveBeenCalled();
  });

  it('is a no-op when already loading', async () => {
    const txs = Array.from({ length: PAGE_SIZE * 2 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const def = deferred<Transaction[]>();
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    repo.getAll = jest.fn(() => def.promise);
    const first = useStore.getState().loadMore();
    const second = useStore.getState().loadMore();
    def.resolve([]);
    await Promise.all([first, second]);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('does not paginate while a replacement refresh is running', async () => {
    const txs = Array.from({ length: PAGE_SIZE }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const refreshed = deferred<Transaction[]>();
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    repo.getAll = jest.fn(() => refreshed.promise);

    const refreshPromise = useStore.getState().refresh();
    const loadMorePromise = useStore.getState().loadMore();

    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(useStore.getState().status).toBe('refreshing');

    refreshed.resolve(txs);
    await Promise.all([refreshPromise, loadMorePromise]);
    expect(useStore.getState()).toMatchObject({
      transactions: txs,
      status: 'ready',
      loadingMore: false,
    });
  });

  it('keeps rows and exposes a retryable state when pagination fails', async () => {
    const txs = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await useStore.getState().setQuery({});
    (repo.getAll as jest.Mock).mockRejectedValueOnce(new Error('page failed'));

    await expect(useStore.getState().loadMore()).resolves.toBeUndefined();
    expect(useStore.getState()).toMatchObject({
      transactions: txs.slice(0, PAGE_SIZE),
      paginationError: true,
      loadingMore: false,
    });

    await useStore.getState().loadMore();
    expect(useStore.getState()).toMatchObject({
      transactions: txs,
      paginationError: false,
      hasMore: false,
    });
    consoleSpy.mockRestore();
  });

  it('does not paginate a snapshot whose replacement refresh failed', async () => {
    const txs = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await useStore.getState().setQuery({});
    (repo.getAll as jest.Mock).mockRejectedValueOnce(new Error('refresh failed'));
    await expect(useStore.getState().refresh()).rejects.toThrow('refresh failed');
    (repo.getAll as jest.Mock).mockClear();

    await useStore.getState().loadMore();

    expect(repo.getAll).not.toHaveBeenCalled();
    expect(useStore.getState()).toMatchObject({
      transactions: txs.slice(0, PAGE_SIZE),
      status: 'refreshErrorWithData',
    });
    consoleSpy.mockRestore();
  });
});

describe('transactionStore.refresh', () => {
  it('advances the replacement request id when a refresh fails', async () => {
    const repo = makeRepo([makeTransaction({ id: 'stable' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    const replacementRequestId = useStore.getState().replacementRequestId;
    repo.getAll = jest.fn().mockRejectedValue(new Error('refresh failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(useStore.getState().refresh()).rejects.toThrow('refresh failed');

    expect(useStore.getState().replacementRequestId).toBe(replacementRequestId + 1);
    consoleSpy.mockRestore();
  });

  it('preserves a ready snapshot while refresh is in flight', async () => {
    const repo = makeRepo([makeTransaction({ id: 'before' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    const snapshotKey = useStore.getState().snapshotKey;

    const refreshed = deferred<Transaction[]>();
    repo.getAll = jest.fn(() => refreshed.promise);
    const pending = useStore.getState().refresh();

    expect(useStore.getState()).toMatchObject({
      transactions: [expect.objectContaining({ id: 'before' })],
      snapshotKey,
      status: 'refreshing',
    });

    refreshed.resolve([makeTransaction({ id: 'after' })]);
    await pending;
    expect(useStore.getState()).toMatchObject({
      transactions: [expect.objectContaining({ id: 'after' })],
      snapshotKey,
      status: 'ready',
    });
  });

  it('preserves a ready snapshot when refresh fails', async () => {
    const repo = makeRepo([makeTransaction({ id: 'stable' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    repo.getAll = jest.fn().mockRejectedValue(new Error('refresh failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(useStore.getState().refresh()).rejects.toThrow('refresh failed');

    expect(useStore.getState()).toMatchObject({
      transactions: [expect.objectContaining({ id: 'stable' })],
      snapshotKey: getTransactionQueryKey({}),
      status: 'refreshErrorWithData',
    });
    consoleSpy.mockRestore();
  });

  it('re-fetches page 1 with the current query', async () => {
    const txs = Array.from({ length: 3 }, (_, i) =>
      makeTransaction({ id: `t${i}`, type: TransactionType.Income, category_id: 'cat_salary' }),
    );
    txs.push(makeTransaction({ id: 'expense-1' }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({ type: TransactionType.Income });
    (repo.getAll as jest.Mock).mockClear();
    await useStore.getState().refresh();
    expect(repo.getAll).toHaveBeenCalledWith({
      type: TransactionType.Income,
      limit: PAGE_SIZE,
      offset: 0,
    });
  });
});

describe('transactionStore.addTransaction / deleteTransaction', () => {
  it('addTransaction calls repo.add then refresh()', async () => {
    const repo = makeRepo();
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    const beforeVersion = useStore.getState().mutationVersion;

    await useStore.getState().addTransaction({
      type: TransactionType.Expense,
      amount: 50,
      currency: Currency.EGP,
      egp_amount: 50,
      account_id: 'acc-1',
      category_id: 'cat_food',
    });

    expect(repo.add).toHaveBeenCalled();
    expect(useStore.getState().transactions).toHaveLength(1);
    expect(useStore.getState().mutationVersion).toBe(beforeVersion + 1);
  });

  it('deleteTransaction calls repo.delete then refresh()', async () => {
    const repo = makeRepo([makeTransaction({ id: 'tx-del' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().transactions).toHaveLength(1);
    const beforeVersion = useStore.getState().mutationVersion;

    await useStore.getState().deleteTransaction('tx-del');
    expect(repo.delete).toHaveBeenCalledWith('tx-del');
    expect(useStore.getState().transactions).toHaveLength(0);
    expect(useStore.getState().mutationVersion).toBe(beforeVersion + 1);
  });

  it('addTransaction swallows a refresh failure and still returns the new transaction', async () => {
    const repo = makeRepo();
    const tx = makeTransaction({ id: 'tx-new' });
    repo.add = jest.fn(async () => tx);
    // First call (setQuery) succeeds; subsequent calls (post-add refresh) reject.
    let callCount = 0;
    repo.getAll = jest.fn(async () => {
      if (callCount++ === 0) return [];
      throw new Error('refresh failed');
    });
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    const beforeVersion = useStore.getState().mutationVersion;

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await useStore.getState().addTransaction({
      type: TransactionType.Expense,
      amount: 50,
      currency: Currency.EGP,
      egp_amount: 50,
      account_id: 'acc-1',
    });
    await Promise.resolve();
    consoleSpy.mockRestore();

    expect(result.id).toBe('tx-new');
    expect(useStore.getState().mutationVersion).toBe(beforeVersion + 1);
  });

  it('resolves an add after commit without waiting for the list refresh', async () => {
    const repo = makeRepo();
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    const pendingRefresh = deferred<Transaction[]>();
    repo.getAll = jest.fn(() => pendingRefresh.promise);
    let settled = false;

    const operation = useStore
      .getState()
      .addTransaction({
        type: TransactionType.Expense,
        amount: 50,
        currency: Currency.EGP,
        egp_amount: 50,
        account_id: 'acc-1',
      })
      .then(() => {
        settled = true;
      });
    await Promise.resolve();
    await Promise.resolve();

    try {
      expect(repo.getAll).toHaveBeenCalledTimes(1);
      expect(settled).toBe(true);
    } finally {
      pendingRefresh.resolve([]);
      await operation;
    }
  });

  it('deleteTransaction swallows a refresh failure and still resolves', async () => {
    const repo = makeRepo([makeTransaction({ id: 'tx-del2' })]);
    let callCount = 0;
    const originalGetAll = repo.getAll as jest.Mock;
    repo.getAll = jest.fn(async (query: TransactionListQuery = {}) => {
      if (callCount++ === 0) return originalGetAll(query);
      throw new Error('refresh failed after delete');
    });
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    const beforeVersion = useStore.getState().mutationVersion;

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(useStore.getState().deleteTransaction('tx-del2')).resolves.toBeUndefined();
    consoleSpy.mockRestore();
    expect(useStore.getState().mutationVersion).toBe(beforeVersion + 1);
  });
});

describe('transactionStore.updateTransaction', () => {
  it('calls repo.update then refreshes the list', async () => {
    const tx = makeTransaction({ id: 'tx-upd', amount: 100 });
    const repo = makeRepo([tx]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().transactions[0].amount).toBe(100);
    const beforeVersion = useStore.getState().mutationVersion;

    await useStore.getState().updateTransaction('tx-upd', {
      amount: 250,
      currency: Currency.EGP,
      egp_amount: 250,
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    expect(repo.update).toHaveBeenCalledWith('tx-upd', expect.objectContaining({ amount: 250 }));
    expect(useStore.getState().transactions[0].amount).toBe(250);
    expect(useStore.getState().mutationVersion).toBe(beforeVersion + 1);
  });

  it('swallows a refresh failure after update and still resolves', async () => {
    const tx = makeTransaction({ id: 'tx-upd2' });
    const repo = makeRepo([tx]);
    let callCount = 0;
    const originalGetAll = repo.getAll as jest.Mock;
    repo.getAll = jest.fn(async (query: TransactionListQuery = {}) => {
      if (callCount++ === 0) return originalGetAll(query);
      throw new Error('refresh failed after update');
    });
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    const beforeVersion = useStore.getState().mutationVersion;

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      useStore.getState().updateTransaction('tx-upd2', {
        amount: 99,
        currency: Currency.EGP,
        egp_amount: 99,
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      }),
    ).resolves.toBeUndefined();
    await Promise.resolve();
    consoleSpy.mockRestore();
    expect(useStore.getState().mutationVersion).toBe(beforeVersion + 1);
  });

  it('resolves an update after commit without waiting for the list refresh', async () => {
    const repo = makeRepo([makeTransaction({ id: 'tx-upd3' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    const pendingRefresh = deferred<Transaction[]>();
    repo.getAll = jest.fn(() => pendingRefresh.promise);
    let settled = false;

    const operation = useStore
      .getState()
      .updateTransaction('tx-upd3', {
        amount: 125,
        currency: Currency.EGP,
        egp_amount: 125,
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      })
      .then(() => {
        settled = true;
      });
    await Promise.resolve();
    await Promise.resolve();

    try {
      expect(repo.getAll).toHaveBeenCalledTimes(1);
      expect(settled).toBe(true);
    } finally {
      pendingRefresh.resolve([]);
      await operation;
    }
  });
});

describe('transactionStore.getById', () => {
  it('passes through to repo.getById without touching list state', async () => {
    const tx = makeTransaction({ id: 'one' });
    const repo = makeRepo([tx]);
    const useStore = createTransactionStore(repo);
    const before = useStore.getState().transactions;

    const got = await useStore.getState().getById('one');
    expect(got?.id).toBe('one');
    expect(useStore.getState().transactions).toBe(before);
  });

  it('returns null for a missing id', async () => {
    const repo = makeRepo();
    const useStore = createTransactionStore(repo);
    const got = await useStore.getState().getById('missing');
    expect(got).toBeNull();
  });
});

describe('transactionStore — error handling', () => {
  it('enters first-load error and rethrows when the repo errors', async () => {
    const repo = makeRepo();
    repo.getAll = jest.fn().mockRejectedValue(new Error('db down'));
    const useStore = createTransactionStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(useStore.getState().setQuery({})).rejects.toThrow('db down');
    expect(useStore.getState().status).toBe('firstLoadError');
    consoleSpy.mockRestore();
  });
});

describe('transactionStore.reset', () => {
  it('restores the idle state with an empty query', async () => {
    const repo = makeRepo([makeTransaction({ id: 't1' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({ search: 'x' });
    expect(useStore.getState().transactions).toHaveLength(1);
    expect(useStore.getState().query).toEqual({ search: 'x' });

    useStore.getState().reset();

    expect(useStore.getState()).toMatchObject({
      transactions: [],
      hasMore: false,
      loadingMore: false,
      query: {},
      queryKey: getTransactionQueryKey({}),
      snapshotKey: undefined,
      status: 'idle',
      mutationVersion: 0,
    });
  });
});

describe('transactionStore — deleteTransaction signature', () => {
  it('deleteTransaction exists and is a function on the store', () => {
    const { deleteTransaction } = useTransactionStore.getState();
    expect(typeof deleteTransaction).toBe('function');
  });
});

describe('transactionStore — race guard', () => {
  it('drops out-of-order responses from rapid setQuery calls', async () => {
    const repo = makeRepo();
    const firstDef = deferred<Transaction[]>();
    const secondDef = deferred<Transaction[]>();
    let call = 0;
    repo.getAll = jest.fn(() => (call++ === 0 ? firstDef.promise : secondDef.promise));

    const useStore = createTransactionStore(repo);
    const slow = useStore.getState().setQuery({ search: 'a' });
    const fast = useStore.getState().setQuery({ search: 'ab' });

    // Resolve the fresher request first, then the stale one.
    secondDef.resolve([makeTransaction({ id: 'fresh' })]);
    await fast;
    firstDef.resolve([makeTransaction({ id: 'stale' })]);
    await slow;

    expect(useStore.getState().transactions.map((t) => t.id)).toEqual(['fresh']);
    expect(useStore.getState().query).toEqual({ search: 'ab' });
  });

  it('a stale request that errors does not replace the newer ready snapshot', async () => {
    const repo = makeRepo();
    const firstDef = deferred<Transaction[]>();
    const secondDef = deferred<Transaction[]>();
    let call = 0;
    repo.getAll = jest.fn(() => (call++ === 0 ? firstDef.promise : secondDef.promise));

    const useStore = createTransactionStore(repo);
    const stale = useStore.getState().setQuery({ search: 'a' });
    const fresh = useStore.getState().setQuery({ search: 'ab' });

    // The newer request resolves first and clears loading.
    secondDef.resolve([makeTransaction({ id: 'fresh' })]);
    await fresh;
    expect(useStore.getState().status).toBe('ready');

    // Now have the older request reject (e.g. its DB call timed out). The
    // catch path's request guard must be FALSE, so it must not touch the
    // status or transactions — those belong to the newer
    // request that already settled.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    firstDef.reject(new Error('stale db error'));
    await expect(stale).rejects.toThrow('stale db error');

    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().transactions.map((t) => t.id)).toEqual(['fresh']);
    consoleSpy.mockRestore();
  });
});
