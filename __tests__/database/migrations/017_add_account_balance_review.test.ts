import Database from 'better-sqlite3';

import { MIGRATIONS, type Migration } from '@/database/migrations';

const NOW = '2026-07-19T00:00:00.000Z';

interface AccountReviewRow {
  balance_review_required: number;
  current_balance: number;
  opening_balance: number;
  revolving_balance: number | null;
}

function migration017(): Migration {
  const migration = MIGRATIONS.find(({ version }) => version === 17);
  expect(migration).toBeDefined();
  if (!migration) throw new Error('Expected migration 017');
  return migration;
}

function createDatabaseThrough016(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(
    MIGRATIONS.filter(({ version }) => version <= 16)
      .map(({ up }) => up)
      .join('\n'),
  );
  return db;
}

function insertAccount(
  db: Database.Database,
  input: {
    id: string;
    type: 'bank' | 'credit_card';
    opening: number;
    current: number;
    revolving?: number;
  },
): void {
  db.prepare(
    `INSERT INTO accounts
       (id, name, type, currency, opening_balance, current_balance,
        revolving_balance, interest_tracking, is_archived, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, 'EGP', ?, ?, ?, 0, 0, 0, ?, ?)`,
  ).run(
    input.id,
    input.id,
    input.type,
    input.opening,
    input.current,
    input.revolving ?? null,
    NOW,
    NOW,
  );
}

function insertTransaction(
  db: Database.Database,
  input: {
    id: string;
    type: 'expense' | 'income' | 'cc_payment';
    accountId: string;
    toAccountId?: string;
  },
): void {
  db.prepare(
    `INSERT INTO transactions
       (id, type, amount, currency, egp_amount, account_id, to_account_id,
        transaction_date, transaction_time, created_at, updated_at)
     VALUES (?, ?, 100, 'EGP', 100, ?, ?, '2026-07-01', '12:00:00', ?, ?)`,
  ).run(input.id, input.type, input.accountId, input.toAccountId ?? null, NOW, NOW);
}

describe('migration017 - legacy credit-card balance review', () => {
  it('flags only credit cards with generic expense or income rows', () => {
    const db = createDatabaseThrough016();
    insertAccount(db, {
      id: 'affected-expense',
      type: 'credit_card',
      opening: 1000,
      current: 850,
      revolving: 300,
    });
    insertAccount(db, {
      id: 'affected-income',
      type: 'credit_card',
      opening: 500,
      current: 450,
      revolving: 100,
    });
    insertAccount(db, {
      id: 'payment-only',
      type: 'credit_card',
      opening: 400,
      current: 300,
      revolving: 100,
    });
    insertAccount(db, { id: 'asset', type: 'bank', opening: 2000, current: 1700 });
    insertTransaction(db, {
      id: 'expense',
      type: 'expense',
      accountId: 'affected-expense',
    });
    insertTransaction(db, {
      id: 'income',
      type: 'income',
      accountId: 'affected-income',
    });
    insertTransaction(db, {
      id: 'payment',
      type: 'cc_payment',
      accountId: 'asset',
      toAccountId: 'payment-only',
    });

    db.exec(migration017().up);

    const reviewState = db
      .prepare('SELECT id, balance_review_required FROM accounts ORDER BY id')
      .all() as { balance_review_required: number; id: string }[];
    expect(reviewState).toEqual([
      { id: 'affected-expense', balance_review_required: 1 },
      { id: 'affected-income', balance_review_required: 1 },
      { id: 'asset', balance_review_required: 0 },
      { id: 'payment-only', balance_review_required: 0 },
    ]);
    db.close();
  });

  it('does not rewrite any historical balance field', () => {
    const db = createDatabaseThrough016();
    insertAccount(db, {
      id: 'affected',
      type: 'credit_card',
      opening: 1000,
      current: 850,
      revolving: 300,
    });
    insertTransaction(db, { id: 'expense', type: 'expense', accountId: 'affected' });

    const before = db
      .prepare(
        `SELECT opening_balance, current_balance, revolving_balance,
                0 AS balance_review_required
           FROM accounts WHERE id = 'affected'`,
      )
      .get() as AccountReviewRow;

    db.exec(migration017().up);

    const after = db
      .prepare(
        `SELECT opening_balance, current_balance, revolving_balance, balance_review_required
           FROM accounts WHERE id = 'affected'`,
      )
      .get() as AccountReviewRow;
    expect(after).toEqual({ ...before, balance_review_required: 1 });
    db.close();
  });

  it('defaults new accounts to not requiring review and enforces boolean values', () => {
    const db = createDatabaseThrough016();
    db.exec(migration017().up);
    insertAccount(db, {
      id: 'new-card',
      type: 'credit_card',
      opening: 0,
      current: 0,
      revolving: 0,
    });

    const row = db
      .prepare("SELECT balance_review_required FROM accounts WHERE id = 'new-card'")
      .get() as { balance_review_required: number };
    expect(row.balance_review_required).toBe(0);
    expect(() =>
      db.prepare("UPDATE accounts SET balance_review_required = 2 WHERE id = 'new-card'").run(),
    ).toThrow();
    db.close();
  });
});
