import Database from 'better-sqlite3';

import { AccountType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { moveUnpaidPaymentsToAccount } from '@/modules/commitments/database/commitment_payments';
import { moveActiveCommitmentsToAccount } from '@/modules/commitments/database/commitments';
import { bridgeBetterSQLite, getExpoSQLiteTestDatabase } from '@/test_helpers/sqlite';

const sqlite = getExpoSQLiteTestDatabase();
let realDb: ReturnType<typeof Database>;

const NOW = '2026-09-08T00:00:00.000Z';
const MOVED_AT = '2026-09-15T00:00:00.000Z';
const FROM = 'from';
const TO = 'to';

function seed(): void {
  const account = realDb.prepare(
    `INSERT INTO accounts
       (id, name, type, currency, opening_balance, current_balance, interest_tracking,
        is_archived, is_deleted, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, 'EGP', 0, 0, 0, ?, 0, 0, ?, ?)`,
  );
  account.run(FROM, 'Old Bank', AccountType.Bank, 1, NOW, NOW);
  account.run(TO, 'Cash', AccountType.Bank, 0, NOW, NOW);

  realDb
    .prepare(
      `INSERT INTO categories (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES ('cat1', 'Bills', 'expense', 'tag', '#C9973A', 0, 0, ?, ?)`,
    )
    .run(NOW, NOW);

  const commitment = realDb.prepare(
    `INSERT INTO commitments
       (id, name, amount_type, amount, currency, category_id, recurrence_every,
        recurrence_period, start_date, account_id, duration_type, is_active, created_at, updated_at)
     VALUES (?, ?, 'fixed', 200, 'EGP', 'cat1', 1, 'months', '2026-01-01', ?, 'forever', ?, ?, ?)`,
  );
  commitment.run('com-on', 'Gym', FROM, 1, NOW, NOW);
  commitment.run('com-off', 'Old gym', FROM, 0, NOW, NOW);
  commitment.run('com-to', 'Netflix', TO, 1, NOW, NOW);

  const payment = realDb.prepare(
    `INSERT INTO commitment_payments
       (id, commitment_id, due_date, paid_date, skipped_date, amount_due, amount_paid, currency,
        account_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 200, ?, 'EGP', ?, ?, ?, ?)`,
  );
  payment.run('pay-paid', 'com-on', '2026-07-01', '2026-07-01', null, 200, FROM, 'paid', NOW, NOW);
  payment.run(
    'pay-skipped',
    'com-on',
    '2026-08-01',
    null,
    '2026-08-01',
    null,
    FROM,
    'skipped',
    NOW,
    NOW,
  );
  payment.run('pay-overdue', 'com-on', '2026-09-01', null, null, null, FROM, 'overdue', NOW, NOW);
  payment.run('pay-due', 'com-on', '2026-09-10', null, null, null, FROM, 'due', NOW, NOW);
  payment.run('pay-upcoming', 'com-on', '2026-10-01', null, null, null, FROM, 'upcoming', NOW, NOW);
  payment.run('pay-to', 'com-to', '2026-10-01', null, null, null, TO, 'upcoming', NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  realDb.pragma('foreign_keys = ON');
  bridgeBetterSQLite(sqlite, realDb);
});

beforeEach(() => {
  realDb.exec(
    'DELETE FROM commitment_payments; DELETE FROM commitments; DELETE FROM accounts; DELETE FROM categories;',
  );
  seed();
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

function accountOf(table: 'commitments' | 'commitment_payments', id: string) {
  return realDb.prepare(`SELECT account_id, updated_at FROM ${table} WHERE id = ?`).get(id) as {
    account_id: string | null;
    updated_at: string;
  };
}

describe('moving the active commitments and their unpaid payments to another account', () => {
  it('moves the unpaid payments of the active commitment and leaves history on the old account', async () => {
    await expect(moveUnpaidPaymentsToAccount(sqlite.database, FROM, TO, MOVED_AT)).resolves.toBe(3);

    for (const id of ['pay-upcoming', 'pay-due', 'pay-overdue']) {
      expect(accountOf('commitment_payments', id)).toEqual({
        account_id: TO,
        updated_at: MOVED_AT,
      });
    }
    for (const id of ['pay-paid', 'pay-skipped']) {
      expect(accountOf('commitment_payments', id)).toEqual({ account_id: FROM, updated_at: NOW });
    }
    expect(accountOf('commitment_payments', 'pay-to')).toEqual({ account_id: TO, updated_at: NOW });
  });

  it('moves the active commitment only, leaving the inactive one and the target’s own alone', async () => {
    await expect(moveActiveCommitmentsToAccount(sqlite.database, FROM, TO, MOVED_AT)).resolves.toBe(
      1,
    );

    expect(accountOf('commitments', 'com-on')).toEqual({ account_id: TO, updated_at: MOVED_AT });
    expect(accountOf('commitments', 'com-off')).toEqual({ account_id: FROM, updated_at: NOW });
    expect(accountOf('commitments', 'com-to')).toEqual({ account_id: TO, updated_at: NOW });
  });

  it('moves nothing once the commitments already name the other account, so the payment move runs first', async () => {
    await moveActiveCommitmentsToAccount(sqlite.database, FROM, TO, MOVED_AT);

    await expect(moveUnpaidPaymentsToAccount(sqlite.database, FROM, TO, MOVED_AT)).resolves.toBe(0);
    expect(accountOf('commitment_payments', 'pay-upcoming').account_id).toBe(FROM);
  });

  it('writes no amount on either table', async () => {
    const amounts = () => ({
      commitments: realDb.prepare('SELECT id, amount FROM commitments ORDER BY id').all(),
      payments: realDb
        .prepare('SELECT id, amount_due, amount_paid FROM commitment_payments ORDER BY id')
        .all(),
    });
    const before = amounts();

    await moveUnpaidPaymentsToAccount(sqlite.database, FROM, TO, MOVED_AT);
    await moveActiveCommitmentsToAccount(sqlite.database, FROM, TO, MOVED_AT);

    expect(amounts()).toEqual(before);
  });
});
