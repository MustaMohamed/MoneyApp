import Database from 'better-sqlite3';

import { AccountType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { insertTransactionRow } from '@/modules/transactions/database/transactions';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { TransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import { createTransactionStore } from '@/modules/transactions/store/transaction.store';
import { bridgeBetterSQLite, getExpoSQLiteTestDatabase } from '@/test_helpers/sqlite';
import { makeTestTransaction } from '@/test_helpers/transaction';

const sqlite = getExpoSQLiteTestDatabase();
let realDb: ReturnType<typeof Database>;
let store: ReturnType<typeof createTransactionStore>;

const NOW = '2026-07-01T08:00:00.000Z';
const ACCOUNT = 'acc-bank';
const SEEDED = 95;
const JULY = { dateFrom: '2026-07-01', dateTo: '2026-07-31' };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function julyExpense(overrides: Partial<Transaction>): Transaction {
  return makeTestTransaction({
    account_id: ACCOUNT,
    category_id: 'cat_food',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  });
}

async function seed(): Promise<void> {
  realDb
    .prepare(
      `INSERT INTO accounts
         (id, name, type, currency, opening_balance, current_balance, interest_tracking,
          is_archived, is_deleted, sort_order, created_at, updated_at)
       VALUES (?, 'Bank', ?, 'EGP', 50000, 50000, 0, 0, 0, 0, ?, ?)`,
    )
    .run(ACCOUNT, AccountType.Bank, NOW, NOW);

  for (let index = 0; index < SEEDED; index++) {
    await insertTransactionRow(
      sqlite.database,
      julyExpense({
        id: `tx-${pad(index)}`,
        transaction_date: `2026-07-${pad(1 + (index % 31))}`,
        transaction_time: index % 2 === 0 ? '09:00:00' : '18:00:00',
      }),
    );
  }
  await insertTransactionRow(
    sqlite.database,
    julyExpense({ id: 'tx-june', transaction_date: '2026-06-30', transaction_time: '23:00:00' }),
  );
}

function julyIdsInDb(): string[] {
  return realDb
    .prepare(
      `SELECT id FROM transactions
        WHERE transaction_date >= '2026-07-01' AND transaction_date <= '2026-07-31'
        ORDER BY transaction_date DESC, transaction_time DESC, created_at DESC, id DESC`,
    )
    .pluck()
    .all()
    .map((id) => String(id));
}

function loadedIds(): string[] {
  return store.getState().transactions.map((transaction) => transaction.id);
}

async function loadThreePages(): Promise<void> {
  await store.getState().setQuery(JULY);
  await store.getState().loadMore();
  await store.getState().loadMore();
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  realDb.pragma('foreign_keys = ON');

  bridgeBetterSQLite(sqlite, realDb);
  sqlite.execAsync.mockImplementation(async (sql: string) => {
    realDb.exec(sql);
  });
  sqlite.withTransactionAsync.mockImplementation(async (task: () => Promise<void>) => {
    realDb.exec('BEGIN');
    try {
      await task();
      realDb.exec('COMMIT');
    } catch (error) {
      realDb.exec('ROLLBACK');
      throw error;
    }
  });
});

beforeEach(async () => {
  realDb.exec('DELETE FROM transactions; DELETE FROM accounts;');
  await seed();
  store = createTransactionStore(new TransactionRepository());
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

describe('transactionStore refresh window on a real database (MA-089)', () => {
  it('returns from a detail with every loaded page, then pages on with no duplicate and no gap', async () => {
    await loadThreePages();
    const before = loadedIds();
    expect(before).toEqual(julyIdsInDb().slice(0, 90));

    await store.getState().refresh();

    expect(loadedIds()).toHaveLength(90);
    expect(loadedIds()).toEqual(before);
    expect(store.getState()).toMatchObject({ hasMore: true, status: 'ready' });

    await store.getState().loadMore();

    expect(loadedIds()).toEqual(julyIdsInDb());
    expect(new Set(loadedIds()).size).toBe(SEEDED);
    expect(store.getState().hasMore).toBe(false);
  });

  it('puts a write made elsewhere first on return and pages on to every row', async () => {
    await loadThreePages();
    const before = loadedIds();
    await insertTransactionRow(
      sqlite.database,
      julyExpense({
        id: 'tx-elsewhere',
        transaction_date: '2026-07-31',
        transaction_time: '23:59:59',
      }),
    );
    store.getState().announceExternalWrite();

    await store.getState().refresh();

    expect(loadedIds()).toHaveLength(90);
    expect(loadedIds()).toEqual(['tx-elsewhere', ...before.slice(0, 89)]);
    expect(store.getState().hasMore).toBe(true);

    await store.getState().loadMore();

    expect(julyIdsInDb()).toHaveLength(SEEDED + 1);
    expect(loadedIds()).toEqual(julyIdsInDb());
  });

  it('drops a row deleted from its detail and keeps every other loaded row', async () => {
    await loadThreePages();
    const before = loadedIds();
    const deletedId = before[45];
    const ninetyFirst = julyIdsInDb()[90];

    await store.getState().deleteTransaction(deletedId);

    expect(loadedIds()).toHaveLength(90);
    expect(loadedIds()).not.toContain(deletedId);
    expect(loadedIds()).toEqual([...before.filter((id) => id !== deletedId), ninetyFirst]);
  });
});
