import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import { MIGRATIONS } from '@/database/migrations';
import { insertTransactionRow, updateTransactionRow } from '@/database/transactions';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
  realDb
    .prepare(
      `INSERT INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc_asset','Checking','bank','EGP',1000,1000,0,0,0,?,?)`,
    )
    .run(NOW, NOW);

  const mocked = (
    SQLite as unknown as {
      __fakeDb: { runAsync: jest.Mock };
    }
  ).__fakeDb;
  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    const result = realDb.prepare(sql).run(...(params as never[]));
    return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
  realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc_asset'").run();
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof updateTransactionRow
>[0];

function makeTx(): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    revolving_balance_delta: null,
    account_id: 'acc_asset',
    to_account_id: null,
    category_id: 'cat_food',
    budget_id: null,
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '12:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

describe('updateTransactionRow', () => {
  it('updates mutable row fields and the supplied payment snapshot only', async () => {
    await insertTransactionRow(mockDb, makeTx());

    await expect(
      updateTransactionRow(
        mockDb,
        'tx-1',
        {
          amount: 250,
          currency: Currency.EGP,
          egp_amount: 250,
          exchange_rate: null,
          to_amount: null,
          category_id: 'cat_groceries',
          budget_id: null,
          note: 'Updated',
          transaction_date: '2026-05-02',
          transaction_time: '09:30:00',
        },
        75,
        -25,
        '2026-05-02T09:30:00.000Z',
      ),
    ).resolves.toBe(1);

    expect(realDb.prepare("SELECT * FROM transactions WHERE id = 'tx-1'").get()).toMatchObject({
      amount: 250,
      egp_amount: 250,
      category_id: 'cat_groceries',
      note: 'Updated',
      minimum_payment_snapshot: 75,
      revolving_balance_delta: -25,
      account_id: 'acc_asset',
    });
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(1000);
  });

  it('reports zero changed rows for a missing transaction', async () => {
    await expect(
      updateTransactionRow(
        mockDb,
        'missing',
        {
          amount: 250,
          currency: Currency.EGP,
          egp_amount: 250,
          transaction_date: '2026-05-02',
          transaction_time: '09:30:00',
        },
        null,
        null,
        NOW,
      ),
    ).resolves.toBe(0);
  });
});
