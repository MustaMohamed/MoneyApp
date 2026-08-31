import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';
import { migration015 } from '@/database/migrations/015_add_budget_id_to_transactions';

const openDbs: ReturnType<typeof Database>[] = [];

const NOW = '2026-07-14T00:00:00.000Z';

function createAccount(db: Database.Database) {
  db.prepare(
    `INSERT INTO accounts
     (id,name,type,currency,opening_balance,current_balance,interest_tracking,is_archived,sort_order,created_at,updated_at)
     VALUES ('acc','Cash','bank','EGP',0,0,0,0,0,?,?)`,
  ).run(NOW, NOW);
}

// afterEach, not the sibling afterAll(close) spelling: a test that throws mid-body still
// reaches this afterEach with its handle already pushed, so afterAll would leave it
// stranded until the file's last test — afterEach drains after every test instead.
afterEach(() => {
  const drained = openDbs.splice(0);
  const closeFailures: unknown[] = [];
  for (const db of drained) {
    try {
      db.close();
    } catch (err) {
      closeFailures.push(err);
    }
  }
  // One assertion, not a bare-boolean loop: it names which drained index(es) are still
  // open AND surfaces every close() error's text in the same failure, so a stranded
  // handle never reports as an anonymous `expect(db.open).toBe(false)` with the real
  // cause silently dropped. Passes only when both are empty, so the throws below are
  // unreachable on green — they exist to preserve stack fidelity on the failure path.
  const stranded = drained.flatMap((db, i) => (db.open ? [i] : []));
  expect({ stranded, closeErrors: closeFailures.map(String) }).toEqual({
    stranded: [],
    closeErrors: [],
  });
  if (closeFailures.length === 1) throw closeFailures[0];
  if (closeFailures.length > 1) throw new AggregateError(closeFailures);
});

describe('migration015 - named budget transaction assignment', () => {
  it('adds nullable budget_id and an index without changing existing rows', () => {
    const db = new Database(':memory:');
    openDbs.push(db);
    db.exec(
      MIGRATIONS.filter((migration) => migration.version <= 14)
        .map((migration) => migration.up)
        .join('\n'),
    );
    createAccount(db);
    db.prepare(
      `INSERT INTO transactions
       (id,type,amount,currency,egp_amount,account_id,category_id,transaction_date,transaction_time,created_at,updated_at)
       VALUES ('tx','expense',100,'EGP',100,'acc','cat_food','2026-07-10','12:00:00',?,?)`,
    ).run(NOW, NOW);

    db.exec(migration015.up);

    const columns = db.prepare('PRAGMA table_info(transactions)').all() as { name: string }[];
    const indexes = db.prepare("PRAGMA index_list('transactions')").all() as { name: string }[];
    const row = db.prepare("SELECT budget_id FROM transactions WHERE id = 'tx'").get() as {
      budget_id: string | null;
    };

    expect(columns.map(({ name }) => name)).toContain('budget_id');
    expect(indexes.map(({ name }) => name)).toContain('idx_transactions_budget_id');
    expect(row.budget_id).toBeNull();
  });

  it('sets linked transaction budget_id to null when the budget is deleted', () => {
    const db = new Database(':memory:');
    openDbs.push(db);
    db.pragma('foreign_keys = ON');
    db.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
    createAccount(db);
    db.prepare(
      `INSERT INTO budgets
       (id,category_id,name,limit_amount,effective_from,created_at,updated_at)
       VALUES ('budget_food','cat_food','Meals',500,'2026-07',?,?)`,
    ).run(NOW, NOW);
    db.prepare(
      `INSERT INTO transactions
       (id,type,amount,currency,egp_amount,account_id,category_id,budget_id,transaction_date,transaction_time,created_at,updated_at)
       VALUES ('tx','expense',100,'EGP',100,'acc','cat_food','budget_food','2026-07-10','12:00:00',?,?)`,
    ).run(NOW, NOW);

    db.prepare("DELETE FROM budgets WHERE id = 'budget_food'").run();

    const row = db.prepare("SELECT budget_id FROM transactions WHERE id = 'tx'").get() as {
      budget_id: string | null;
    };
    expect(row.budget_id).toBeNull();
  });
});
