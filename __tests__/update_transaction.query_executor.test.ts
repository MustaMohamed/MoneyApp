import Database from 'better-sqlite3';

import { Currency } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { insertTransactionRow, updateTransactionRow } from '@/database/transactions';
import { getExpoSQLiteTestDatabase, getSQLiteParams } from '@/test_helpers/sqlite';
import { makeTestTransaction } from '@/test_helpers/transaction';

const sqlite = getExpoSQLiteTestDatabase();
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

  const mocked = sqlite;
  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = getSQLiteParams(rest);
    const result = realDb.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
  realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc_asset'").run();
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

const mockDb = sqlite.database;

function makeTx() {
  return makeTestTransaction({
    id: 'tx-1',
    account_id: 'acc_asset',
    category_id: 'cat_food',
    transaction_date: '2026-05-01',
    transaction_time: '12:00:00',
    created_at: NOW,
    updated_at: NOW,
  });
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
