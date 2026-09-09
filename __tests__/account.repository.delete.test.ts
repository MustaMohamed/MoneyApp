import Database from 'better-sqlite3';

import { AccountType, Currency } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import {
  AccountNotArchivedError,
  AccountNotFoundError,
} from '@/modules/accounts/repositories/account.errors';
import {
  AccountRepository,
  type NewAccountInput,
} from '@/modules/accounts/repositories/account.repository';
import * as commitmentsModule from '@/modules/commitments/database/commitments';
import { TransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import { getExpoSQLiteTestDatabase, getSQLiteParams } from '@/test_helpers/sqlite';

const sqlite = getExpoSQLiteTestDatabase();
let realDb: ReturnType<typeof Database>;

const NOW = '2026-09-08T00:00:00.000Z';
const TARGET = 'target';
const SURVIVOR = 'survivor';
const LIVE = 'live_unarchived';

const repo = new AccountRepository();

const baseInput: NewAccountInput = {
  name: 'Old Card',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 0,
  color: null,
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  sort_order: 9,
};

interface BalanceRow {
  current_balance: number;
  revolving_balance: number | null;
}

interface TransactionShapeRow {
  account_id: string;
  amount: number;
  egp_amount: number;
  id: string;
  to_account_id: string | null;
  to_amount: number | null;
}

function balancesOf(id: string): BalanceRow {
  return realDb
    .prepare('SELECT current_balance, revolving_balance FROM accounts WHERE id = ?')
    .get(id) as BalanceRow;
}

function transactionShapes(): TransactionShapeRow[] {
  return realDb
    .prepare(
      `SELECT id, amount, egp_amount, to_amount, account_id, to_account_id
         FROM transactions ORDER BY id`,
    )
    .all() as TransactionShapeRow[];
}

function seed(): void {
  const account = realDb.prepare(
    `INSERT INTO accounts
       (id, name, type, currency, opening_balance, current_balance, credit_limit,
        revolving_balance, interest_tracking, is_archived, is_deleted, sort_order,
        created_at, updated_at)
     VALUES (?, ?, ?, 'EGP', 0, ?, ?, ?, 0, ?, 0, 0, ?, ?)`,
  );
  account.run(TARGET, 'Old Card', AccountType.Bank, 1000, null, null, 1, NOW, NOW);
  account.run(SURVIVOR, 'Survivor', AccountType.Bank, 2000, null, null, 0, NOW, NOW);
  account.run(LIVE, 'Still here', AccountType.CreditCard, 500, 5000, 200, 0, NOW, NOW);

  realDb
    .prepare(
      `INSERT INTO categories (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES ('cat1', 'Bills', 'expense', 'tag', '#C9973A', 0, 0, ?, ?)`,
    )
    .run(NOW, NOW);

  const transaction = realDb.prepare(
    `INSERT INTO transactions
       (id, type, amount, currency, egp_amount, to_amount, account_id, to_account_id,
        category_id, commitment_payment_id, transaction_date, transaction_time,
        created_at, updated_at)
     VALUES (?, ?, ?, 'EGP', ?, ?, ?, ?, ?, ?, '2026-09-01', '12:00:00', ?, ?)`,
  );
  transaction.run('tx-expense', 'expense', 100, 100, null, TARGET, null, 'cat1', null, NOW, NOW);
  transaction.run(
    'tx-transfer-out',
    'transfer',
    50,
    50,
    50,
    TARGET,
    SURVIVOR,
    null,
    null,
    NOW,
    NOW,
  );
  transaction.run('tx-transfer-in', 'transfer', 70, 70, 70, SURVIVOR, TARGET, null, null, NOW, NOW);
  transaction.run('tx-paid', 'expense', 30, 30, null, TARGET, null, 'cat1', 'pay-1', NOW, NOW);

  const commitment = realDb.prepare(
    `INSERT INTO commitments
       (id, name, amount_type, amount, currency, category_id, recurrence_every,
        recurrence_period, start_date, account_id, duration_type, is_active, created_at, updated_at)
     VALUES (?, ?, 'fixed', 200, 'EGP', 'cat1', 1, 'months', '2026-01-01', ?, 'forever', 1, ?, ?)`,
  );
  commitment.run('com-target', 'Gym', TARGET, NOW, NOW);
  commitment.run('com-survivor', 'Netflix', SURVIVOR, NOW, NOW);

  realDb
    .prepare(
      `INSERT INTO commitment_payments
         (id, commitment_id, due_date, paid_date, amount_due, amount_paid, currency,
          account_id, transaction_id, status, created_at, updated_at)
       VALUES ('pay-1', 'com-target', '2026-09-01', '2026-09-01', 30, 30, 'EGP', ?, 'tx-paid', 'paid', ?, ?)`,
    )
    .run(TARGET, NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  realDb.pragma('foreign_keys = ON');

  sqlite.execAsync.mockImplementation(async (sql: string) => {
    realDb.exec(sql);
  });
  sqlite.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const result = realDb.prepare(sql).run(...getSQLiteParams(rest));
    return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
  });
  sqlite.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) =>
    realDb.prepare(sql).all(...getSQLiteParams(rest)),
  );
  sqlite.getFirstAsync.mockImplementation(
    async (sql: string, ...rest: unknown[]) =>
      realDb.prepare(sql).get(...getSQLiteParams(rest)) ?? null,
  );
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

beforeEach(() => {
  realDb.exec(
    'DELETE FROM commitment_payments; DELETE FROM commitments; DELETE FROM transactions; DELETE FROM accounts; DELETE FROM categories;',
  );
  seed();
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

describe('AccountRepository.delete — the archived guard', () => {
  it('refuses an account that is not archived, and changes nothing', async () => {
    await expect(repo.delete(LIVE)).rejects.toThrow(AccountNotArchivedError);

    const row = realDb.prepare('SELECT name, is_deleted FROM accounts WHERE id = ?').get(LIVE) as {
      is_deleted: number;
      name: string;
    };
    expect(row).toEqual({ name: 'Still here', is_deleted: 0 });
  });

  it('refuses an id that resolves to nothing', async () => {
    await expect(repo.delete('no-such-account')).rejects.toThrow(AccountNotFoundError);
  });

  it('refuses a second delete of the same account', async () => {
    await repo.delete(TARGET);
    await expect(repo.delete(TARGET)).rejects.toThrow(AccountNotFoundError);
  });
});

describe('AccountRepository.delete — what leaves and what stays', () => {
  it('takes the account out of both lists while it still resolves for a label', async () => {
    await repo.delete(TARGET);

    const listed = await repo.getAll();
    expect(listed.map((a) => a.id).sort()).toEqual([LIVE, SURVIVOR].sort());
    await expect(repo.getArchived()).resolves.toEqual([]);
    const [row] = await repo.getByIdsIncludingArchived([TARGET]);
    expect(row).toMatchObject({ id: TARGET, is_deleted: 1, is_archived: 1, name: '' });
  });

  it('keeps the deleted row archived — the invariant that makes the is_archived filters exclude it', async () => {
    await repo.delete(TARGET);

    expect(
      realDb.prepare('SELECT is_deleted, is_archived FROM accounts WHERE id = ?').get(TARGET),
    ).toEqual({ is_deleted: 1, is_archived: 1 });
  });

  it('keeps every transaction row and every amount it holds', async () => {
    const before = transactionShapes();
    expect(before).toHaveLength(4);

    await repo.delete(TARGET);

    expect(transactionShapes()).toEqual(before);
  });

  it('leaves the balances of the surviving accounts alone', async () => {
    const survivorBefore = balancesOf(SURVIVOR);
    const liveBefore = balancesOf(LIVE);

    await repo.delete(TARGET);

    expect(balancesOf(SURVIVOR)).toEqual(survivorBefore);
    expect(balancesOf(LIVE)).toEqual(liveBefore);
  });

  it('leaves the deleted account its own balance, unreplayed', async () => {
    const targetBefore = balancesOf(TARGET);

    await repo.delete(TARGET);

    expect(balancesOf(TARGET)).toEqual(targetBefore);
  });

  it('clears the commitment that pointed at it and keeps the payment whole', async () => {
    await repo.delete(TARGET);

    const commitments = realDb
      .prepare('SELECT id, account_id FROM commitments ORDER BY id')
      .all() as { account_id: string | null; id: string }[];
    expect(commitments).toEqual([
      { id: 'com-survivor', account_id: SURVIVOR },
      { id: 'com-target', account_id: null },
    ]);

    const payment = realDb
      .prepare('SELECT account_id, transaction_id FROM commitment_payments WHERE id = ?')
      .get('pay-1') as { account_id: string | null; transaction_id: string | null };
    expect(payment).toEqual({ account_id: TARGET, transaction_id: 'tx-paid' });
  });

  it('frees the name for a new account', async () => {
    await repo.delete(TARGET);

    await repo.add({ ...baseInput, name: 'Old Card' });

    const accounts = await repo.getAll();
    expect(accounts.filter((a) => a.name === 'Old Card')).toHaveLength(1);
  });
});

describe('AccountRepository.delete — atomicity', () => {
  it('rolls the soft delete back when clearing the commitment fails', async () => {
    jest
      .spyOn(commitmentsModule, 'clearCommitmentAccount')
      .mockRejectedValueOnce(new Error('commitment write failed'));

    await expect(repo.delete(TARGET)).rejects.toThrow('commitment write failed');

    const row = realDb
      .prepare('SELECT name, is_deleted, is_archived FROM accounts WHERE id = ?')
      .get(TARGET) as { is_archived: number; is_deleted: number; name: string };
    expect(row).toEqual({ name: 'Old Card', is_deleted: 0, is_archived: 1 });
    expect(
      realDb.prepare("SELECT account_id FROM commitments WHERE id = 'com-target'").get(),
    ).toEqual({ account_id: TARGET });
  });
});

describe('a transaction on a deleted account is still the user’s to delete', () => {
  it('deletes the record and reverses onto the hidden account, leaving live balances alone', async () => {
    await repo.delete(TARGET);
    const survivorBefore = balancesOf(SURVIVOR);

    await new TransactionRepository().delete('tx-expense');

    expect(
      realDb.prepare("SELECT id FROM transactions WHERE id = 'tx-expense'").get(),
    ).toBeUndefined();
    expect(balancesOf(SURVIVOR)).toEqual(survivorBefore);
    expect(balancesOf(TARGET).current_balance).toBe(1100);
  });
});
