import Database from 'better-sqlite3';

import { Currency, TransactionType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { getTransactions, insertTransactionRow } from '@/database/transactions';
import { getExpoSQLiteTestDatabase, getSQLiteParams, isQueryPlanRow } from '@/test_helpers/sqlite';
import { makeTestTransaction } from '@/test_helpers/transaction';

const sqlite = getExpoSQLiteTestDatabase();
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';
const DATE = '2026-05-01';
const TIME = '12:00:00';

function seed() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES
         ('acc_a','Bank A','bank','EGP',1000,1000,0,0,0,?,?),
         ('acc_b','Bank B','bank','EGP',1000,1000,0,0,1,?,?),
         ('acc_c','USD Wallet','smart_wallet','USD',1000,1000,0,0,2,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW);

  realDb
    .prepare(
      `INSERT OR IGNORE INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
       VALUES
         ('cat_food','Food','expense','food','#C9973A',1,0,?,?),
         ('cat_fun','Entertainment','expense','movie','#C9973A',1,1,?,?),
         ('cat_sal','Salary','income','briefcase','#4CAF82',1,0,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seed();

  const mocked = sqlite;

  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = getSQLiteParams(rest);
    realDb.prepare(sql).run(...params);
    return { changes: 1, lastInsertRowId: 1 };
  });

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = getSQLiteParams(rest);
    return realDb.prepare(sql).all(...params);
  });

  mocked.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
    await fn();
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM commitment_payments');
  realDb.exec('DELETE FROM transactions');
  realDb.exec('DELETE FROM commitments');
  realDb.exec('DELETE FROM budgets');
  realDb.prepare('UPDATE accounts SET current_balance = 1000').run();
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

const mockDb = sqlite.database;

async function insert(overrides: Parameters<typeof makeTestTransaction>[0] = {}) {
  const tx = makeTestTransaction({
    id: overrides.id ?? `tx-${Math.random().toString(36).slice(2, 9)}`,
    account_id: 'acc_a',
    category_id: 'cat_food',
    transaction_date: DATE,
    transaction_time: TIME,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  });
  await insertTransactionRow(mockDb, tx);
  return tx;
}

describe('getTransactions — accountIds filter', () => {
  it('empty accountIds matches all (no constraint)', async () => {
    await insert({ id: 't1', account_id: 'acc_a' });
    await insert({ id: 't2', account_id: 'acc_b' });

    const out = await getTransactions(mockDb, { accountIds: [] });
    expect(out).toHaveLength(2);
  });

  it('single accountId matches only that account', async () => {
    await insert({ id: 't1', account_id: 'acc_a' });
    await insert({ id: 't2', account_id: 'acc_b' });

    const out = await getTransactions(mockDb, { accountIds: ['acc_a'] });
    expect(out.map((t) => t.id).sort()).toEqual(['t1']);
  });

  it('multiple accountIds match any', async () => {
    await insert({ id: 't1', account_id: 'acc_a' });
    await insert({ id: 't2', account_id: 'acc_b' });
    await insert({ id: 't3', account_id: 'acc_c', currency: Currency.USD });

    const out = await getTransactions(mockDb, { accountIds: ['acc_a', 'acc_c'] });
    expect(out.map((t) => t.id).sort()).toEqual(['t1', 't3']);
  });

  it('matches transfers when EITHER source OR destination is in the list', async () => {
    await insert({
      id: 'xfer1',
      type: TransactionType.Transfer,
      account_id: 'acc_a',
      to_account_id: 'acc_b',
      category_id: null,
    });
    // Filtering by acc_b alone should still match this transfer.
    const out = await getTransactions(mockDb, { accountIds: ['acc_b'] });
    expect(out.map((t) => t.id)).toEqual(['xfer1']);
  });
});

describe('getTransactions — categoryIds filter', () => {
  it('empty categoryIds matches all', async () => {
    await insert({ id: 't1', category_id: 'cat_food' });
    await insert({ id: 't2', category_id: 'cat_fun' });
    const out = await getTransactions(mockDb, { categoryIds: [] });
    expect(out).toHaveLength(2);
  });

  it('multiple categoryIds match any', async () => {
    await insert({ id: 't1', category_id: 'cat_food' });
    await insert({ id: 't2', category_id: 'cat_fun' });
    await insert({ id: 't3', type: TransactionType.Income, category_id: 'cat_sal' });

    const out = await getTransactions(mockDb, { categoryIds: ['cat_food', 'cat_sal'] });
    expect(out.map((t) => t.id).sort()).toEqual(['t1', 't3']);
  });

  it('does NOT match transactions with NULL category_id', async () => {
    await insert({
      id: 'xfer',
      type: TransactionType.Transfer,
      category_id: null,
      to_account_id: 'acc_b',
    });
    const out = await getTransactions(mockDb, { categoryIds: ['cat_food'] });
    expect(out).toHaveLength(0);
  });
});

describe('getTransactions — date range filter', () => {
  it('dateFrom alone returns rows on or after that date', async () => {
    await insert({ id: 't1', transaction_date: '2026-04-15' });
    await insert({ id: 't2', transaction_date: '2026-05-01' });
    await insert({ id: 't3', transaction_date: '2026-05-15' });

    const out = await getTransactions(mockDb, { dateFrom: '2026-05-01' });
    expect(out.map((t) => t.id).sort()).toEqual(['t2', 't3']);
  });

  it('dateTo alone returns rows on or before that date', async () => {
    await insert({ id: 't1', transaction_date: '2026-04-15' });
    await insert({ id: 't2', transaction_date: '2026-05-01' });
    await insert({ id: 't3', transaction_date: '2026-05-15' });

    const out = await getTransactions(mockDb, { dateTo: '2026-05-01' });
    expect(out.map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('dateFrom and dateTo combine for inclusive range', async () => {
    await insert({ id: 't1', transaction_date: '2026-04-15' });
    await insert({ id: 't2', transaction_date: '2026-05-01' });
    await insert({ id: 't3', transaction_date: '2026-05-15' });
    await insert({ id: 't4', transaction_date: '2026-06-01' });

    const out = await getTransactions(mockDb, { dateFrom: '2026-05-01', dateTo: '2026-05-15' });
    expect(out.map((t) => t.id).sort()).toEqual(['t2', 't3']);
  });
});

describe('getTransactions — amount range filter (currency-aware)', () => {
  it('amountMin matches only rows of the given currency at or above the threshold', async () => {
    await insert({ id: 'egp_low', currency: Currency.EGP, amount: 50 });
    await insert({ id: 'egp_hi', currency: Currency.EGP, amount: 200 });
    await insert({ id: 'usd_hi', currency: Currency.USD, account_id: 'acc_c', amount: 80 });

    const out = await getTransactions(mockDb, {
      amountMin: 100,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['egp_hi']);
  });

  it('amountMax matches only rows of the given currency at or below the threshold', async () => {
    await insert({ id: 'egp_low', currency: Currency.EGP, amount: 50 });
    await insert({ id: 'egp_hi', currency: Currency.EGP, amount: 200 });
    await insert({ id: 'usd_low', currency: Currency.USD, account_id: 'acc_c', amount: 30 });

    const out = await getTransactions(mockDb, {
      amountMax: 60,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['egp_low']);
  });

  it('USD currency matches only USD rows', async () => {
    await insert({ id: 'egp_50', currency: Currency.EGP, amount: 50 });
    await insert({ id: 'usd_50', currency: Currency.USD, account_id: 'acc_c', amount: 50 });

    const out = await getTransactions(mockDb, {
      amountMin: 10,
      amountCurrency: Currency.USD,
    });
    expect(out.map((t) => t.id)).toEqual(['usd_50']);
  });

  it('amountMin and amountMax combine inside one currency', async () => {
    await insert({ id: 'a', currency: Currency.EGP, amount: 30 });
    await insert({ id: 'b', currency: Currency.EGP, amount: 75 });
    await insert({ id: 'c', currency: Currency.EGP, amount: 250 });
    await insert({ id: 'd', currency: Currency.USD, account_id: 'acc_c', amount: 75 });

    const out = await getTransactions(mockDb, {
      amountMin: 50,
      amountMax: 100,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['b']);
  });
});

describe('getTransactions — expanded search projection', () => {
  it('searches user-facing transaction type labels', async () => {
    await insert({ id: 'purchase', type: TransactionType.Expense });
    await insert({
      id: 'card-payment',
      type: TransactionType.CCPayment,
      category_id: null,
      to_account_id: 'acc_b',
    });

    expect((await getTransactions(mockDb, { search: 'credit pay' })).map((row) => row.id)).toEqual([
      'card-payment',
    ]);
  });

  it('searches named budgets and commitment sources', async () => {
    realDb
      .prepare(
        `INSERT INTO budgets
         (id, category_id, name, limit_amount, effective_from, created_at, updated_at)
         VALUES ('budget-trip', 'cat_food', 'Road trip meals', 2000, '2026-05', ?, ?)`,
      )
      .run(NOW, NOW);
    realDb
      .prepare(
        `INSERT INTO commitments
         (id, name, amount_type, amount, currency, category_id,
          recurrence_every, recurrence_period, start_date, duration_type,
          is_active, created_at, updated_at)
         VALUES ('commitment-power', 'Electric bill', 'fixed', 300, 'EGP', 'cat_food',
                 1, 'months', '2026-05-01', 'forever', 1, ?, ?)`,
      )
      .run(NOW, NOW);
    realDb
      .prepare(
        `INSERT INTO commitment_payments
         (id, commitment_id, due_date, amount_due, currency, status, created_at, updated_at)
         VALUES ('payment-power', 'commitment-power', '2026-05-01', 300, 'EGP', 'paid', ?, ?)`,
      )
      .run(NOW, NOW);
    await insert({ id: 'budget-row', budget_id: 'budget-trip' });
    await insert({ id: 'commitment-row', commitment_payment_id: 'payment-power' });

    expect((await getTransactions(mockDb, { search: 'road trip' })).map((row) => row.id)).toEqual([
      'budget-row',
    ]);
    expect(
      (await getTransactions(mockDb, { search: 'electric bill' })).map((row) => row.id),
    ).toEqual(['commitment-row']);
  });

  it('searches destination accounts and exact normalized native amounts', async () => {
    await insert({
      id: 'transfer',
      type: TransactionType.Transfer,
      amount: 1500,
      egp_amount: 1500,
      to_amount: 750,
      category_id: null,
      to_account_id: 'acc_b',
    });
    await insert({ id: 'different-amount', amount: 150, egp_amount: 150 });

    expect((await getTransactions(mockDb, { search: 'Bank B' })).map((row) => row.id)).toEqual([
      'transfer',
    ]);
    expect((await getTransactions(mockDb, { search: '1,500' })).map((row) => row.id)).toEqual([
      'transfer',
    ]);
    expect((await getTransactions(mockDb, { search: '750' })).map((row) => row.id)).toEqual([
      'transfer',
    ]);
  });

  it('uses one joined projection without correlated probes across a sizeable history', async () => {
    for (let index = 0; index < 600; index += 1) {
      await insert({
        id: `history-${index}`,
        note: index === 599 ? 'Needle merchant' : `History row ${index}`,
      });
    }

    const rows = await getTransactions(mockDb, {
      search: 'needle merchant',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    });
    const call = sqlite.getAllAsync.mock.calls.at(-1);
    expect(call).toBeDefined();
    if (!call) throw new Error('Expected a transaction search query');
    const [sql, ...rest] = call;
    const params = getSQLiteParams(rest);
    const plan = realDb
      .prepare(`EXPLAIN QUERY PLAN ${sql}`)
      .all(...params)
      .filter(isQueryPlanRow);

    expect(rows.map((row) => row.id)).toEqual(['history-599']);
    expect(plan.map((step) => step.detail).join('\n')).not.toMatch(/CORRELATED SCALAR SUBQUERY/i);
  });
});

describe('getTransactions — combined axes', () => {
  it('AND-composes type, account, category, date, and amount', async () => {
    // Match target: expense, acc_a, cat_food, 2026-05-10, EGP 100
    await insert({
      id: 'match',
      type: TransactionType.Expense,
      account_id: 'acc_a',
      category_id: 'cat_food',
      transaction_date: '2026-05-10',
      amount: 100,
      currency: Currency.EGP,
    });
    // Same date but wrong account
    await insert({
      id: 'wrong_acc',
      account_id: 'acc_b',
      transaction_date: '2026-05-10',
      amount: 100,
    });
    // Right account but outside date range
    await insert({
      id: 'wrong_date',
      account_id: 'acc_a',
      transaction_date: '2026-04-30',
      amount: 100,
    });

    const out = await getTransactions(mockDb, {
      type: TransactionType.Expense,
      accountIds: ['acc_a'],
      categoryIds: ['cat_food'],
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      amountMin: 50,
      amountMax: 200,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['match']);
  });
});

describe('getTransactions — deterministic pagination', () => {
  it('returns stable, non-overlapping pages when transaction timestamps match', async () => {
    const expectedIds: string[] = [];
    for (let index = 0; index < 35; index += 1) {
      const id = `tied-${String(index).padStart(2, '0')}`;
      expectedIds.unshift(id);
      await insert({
        id,
        created_at: `2026-05-01T12:00:${String(index).padStart(2, '0')}.000Z`,
      });
    }

    const firstPage = await getTransactions(mockDb, { limit: 30, offset: 0 });
    const secondPage = await getTransactions(mockDb, { limit: 30, offset: 30 });
    const repeatedFirstPage = await getTransactions(mockDb, { limit: 30, offset: 0 });
    const combinedIds = [...firstPage, ...secondPage].map((row) => row.id);

    expect(combinedIds).toEqual(expectedIds);
    expect(new Set(combinedIds)).toHaveProperty('size', 35);
    expect(repeatedFirstPage.map((row) => row.id)).toEqual(firstPage.map((row) => row.id));
  });
});
