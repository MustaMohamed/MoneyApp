import { Currency, TransactionType } from '@/constants/enums';
import { createTransactionStore, PAGE_SIZE } from '@/store/transaction.store';
import type { Transaction } from '@/database/entities/transaction.entity';
import type {
  ITransactionRepository,
  NewTransactionInput,
  TransactionListQuery,
  UpdateTransactionInput,
} from '@/repositories/transaction.repository';

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
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
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
  it('replaces the list with the page-1 result for the new query', async () => {
    const txs = Array.from({ length: 5 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    expect(useStore.getState().state.transactions).toHaveLength(5);
    expect(useStore.getState().state.query).toEqual({});
  });

  it('sets hasMore=true at exactly PAGE_SIZE rows', async () => {
    const txs = Array.from({ length: PAGE_SIZE }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().state.hasMore).toBe(true);
  });

  it('sets hasMore=false when fewer than PAGE_SIZE rows return', async () => {
    const repo = makeRepo([makeTransaction({ id: 't1' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().state.hasMore).toBe(false);
  });

  it('toggles loading true during fetch and false on completion', async () => {
    const repo = makeRepo();
    const def = deferred<Transaction[]>();
    repo.getAll = jest.fn(() => def.promise);
    const useStore = createTransactionStore(repo);

    const inFlight = useStore.getState().setQuery({});
    expect(useStore.getState().state.loading).toBe(true);
    def.resolve([]);
    await inFlight;
    expect(useStore.getState().state.loading).toBe(false);
  });
});

describe('transactionStore.loadMore', () => {
  it('appends the next page and bumps the offset', async () => {
    const txs = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    expect(useStore.getState().state.transactions).toHaveLength(PAGE_SIZE);
    await useStore.getState().loadMore();
    expect(useStore.getState().state.transactions).toHaveLength(PAGE_SIZE + 5);
    expect(useStore.getState().state.hasMore).toBe(false);
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
});

describe('transactionStore.refresh', () => {
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

    await useStore.getState().addTransaction({
      type: TransactionType.Expense,
      amount: 50,
      currency: Currency.EGP,
      egp_amount: 50,
      account_id: 'acc-1',
      category_id: 'cat_food',
    });

    expect(repo.add).toHaveBeenCalled();
    expect(useStore.getState().state.transactions).toHaveLength(1);
  });

  it('deleteTransaction calls repo.delete then refresh()', async () => {
    const repo = makeRepo([makeTransaction({ id: 'tx-del' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().state.transactions).toHaveLength(1);

    await useStore.getState().deleteTransaction('tx-del');
    expect(repo.delete).toHaveBeenCalledWith('tx-del');
    expect(useStore.getState().state.transactions).toHaveLength(0);
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

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await useStore.getState().addTransaction({
      type: TransactionType.Expense,
      amount: 50,
      currency: Currency.EGP,
      egp_amount: 50,
      account_id: 'acc-1',
    });
    consoleSpy.mockRestore();

    expect(result.id).toBe('tx-new');
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

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(useStore.getState().deleteTransaction('tx-del2')).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});

describe('transactionStore.updateTransaction', () => {
  it('calls repo.update then refreshes the list', async () => {
    const tx = makeTransaction({ id: 'tx-upd', amount: 100 });
    const repo = makeRepo([tx]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().state.transactions[0].amount).toBe(100);

    await useStore.getState().updateTransaction('tx-upd', {
      amount: 250,
      currency: Currency.EGP,
      egp_amount: 250,
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    expect(repo.update).toHaveBeenCalledWith('tx-upd', expect.objectContaining({ amount: 250 }));
    expect(useStore.getState().state.transactions[0].amount).toBe(250);
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
    consoleSpy.mockRestore();
  });
});

describe('transactionStore.getById', () => {
  it('passes through to repo.getById without touching list state', async () => {
    const tx = makeTransaction({ id: 'one' });
    const repo = makeRepo([tx]);
    const useStore = createTransactionStore(repo);
    const before = useStore.getState().state.transactions;

    const got = await useStore.getState().getById('one');
    expect(got?.id).toBe('one');
    expect(useStore.getState().state.transactions).toBe(before);
  });

  it('returns null for a missing id', async () => {
    const repo = makeRepo();
    const useStore = createTransactionStore(repo);
    const got = await useStore.getState().getById('missing');
    expect(got).toBeNull();
  });
});

describe('transactionStore — error handling', () => {
  it('clears the loading flag and rethrows when the repo errors', async () => {
    const repo = makeRepo();
    repo.getAll = jest.fn().mockRejectedValue(new Error('db down'));
    const useStore = createTransactionStore(repo);

    await expect(useStore.getState().setQuery({})).rejects.toThrow('db down');
    expect(useStore.getState().state.loading).toBe(false);
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

    expect(useStore.getState().state.transactions.map((t) => t.id)).toEqual(['fresh']);
    expect(useStore.getState().state.query).toEqual({ search: 'ab' });
  });

  it('a stale request that errors does not clear loading set by a newer request', async () => {
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
    expect(useStore.getState().state.loading).toBe(false);

    // Now have the older request reject (e.g. its DB call timed out). The
    // catch path's `if (myId === requestId)` guard must be FALSE, so it
    // must NOT touch loading or transactions — those belong to the newer
    // request that already settled.
    firstDef.reject(new Error('stale db error'));
    await expect(stale).rejects.toThrow('stale db error');

    expect(useStore.getState().state.loading).toBe(false);
    expect(useStore.getState().state.transactions.map((t) => t.id)).toEqual(['fresh']);
  });
});
