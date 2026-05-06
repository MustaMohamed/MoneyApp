import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { getAccountsStats } from '@/database/account_stats';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';
const DATE = '2026-05-01';
const TIME = '12:00:00';

function seedAccounts() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
     VALUES
       ('acc_bank','Checking','bank','EGP',10000,10000,0,0,0,?,?),
       ('acc_wallet','Wallet','physical_wallet','EGP',0,0,0,0,1,?,?),
       ('acc_usd','USD Account','bank','USD',500,500,0,0,2,?,?),
       ('acc_cc','Credit Card','credit_card','EGP',0,0,0,0,3,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW);
}

function insertTx(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    id: 'tx-1',
    type: 'expense',
    amount: 100,
    currency: 'EGP',
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc_bank',
    to_account_id: null,
    category_id: null,
    note: null,
    transaction_date: DATE,
    transaction_time: TIME,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
  realDb
    .prepare(
      `INSERT INTO transactions
       (id,type,amount,currency,egp_amount,exchange_rate,
        to_amount,minimum_payment_snapshot,
        account_id,to_account_id,category_id,note,
        transaction_date,transaction_time,created_at,updated_at)
       VALUES (@id,@type,@amount,@currency,@egp_amount,@exchange_rate,
        @to_amount,@minimum_payment_snapshot,
        @account_id,@to_account_id,@category_id,@note,
        @transaction_date,@transaction_time,@created_at,@updated_at)`,
    )
    .run(defaults);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seedAccounts();

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        getAllAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getAccountsStats
>[0];

describe('getAccountsStats — transfer counts', () => {
  it('transfer out appears in source month_out, transfer in appears in destination month_in', async () => {
    insertTx({
      id: 'tx-transfer-1',
      type: 'transfer',
      amount: 3000,
      currency: 'EGP',
      egp_amount: 3000,
      to_amount: 3000,
      account_id: 'acc_bank',
      to_account_id: 'acc_wallet',
    });

    const stats = await getAccountsStats(mockDb, ['acc_bank', 'acc_wallet']);

    expect(stats['acc_bank'].month_out).toBe(3000);
    expect(stats['acc_bank'].month_in).toBe(0);
    expect(stats['acc_wallet'].month_in).toBe(3000);
    expect(stats['acc_wallet'].month_out).toBe(0);
  });
});
