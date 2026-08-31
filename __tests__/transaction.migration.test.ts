import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';
import { migration004 } from '@/database/migrations/004_create_transactions';
import { migration005 } from '@/database/migrations/005_add_transaction_native_amounts';
import { migration018 } from '@/database/migrations/018_add_transaction_revolving_delta';

const openDbs: ReturnType<typeof Database>[] = [];

let db: ReturnType<typeof Database>;

beforeEach(() => {
  db = new Database(':memory:');
  openDbs.push(db);
  db.exec(MIGRATIONS.map((m) => m.up).join('\n'));
});

// afterEach, not the sibling afterAll(close) spelling: a test that throws mid-body still
// reaches this afterEach with its handle(s) already pushed, so afterAll would leave them
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

describe('migration004 — transactions table', () => {
  it('creates the transactions table', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
      .get();
    expect(row).toBeDefined();
  });

  it('creates all expected indexes', () => {
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='transactions'")
      .all() as { name: string }[];
    const names = indexes.map((i) => i.name);
    expect(names).toContain('idx_transactions_account_id');
    expect(names).toContain('idx_transactions_date');
    expect(names).toContain('idx_transactions_type');
    expect(names).toContain('idx_transactions_category_id');
  });

  it('is idempotent — running migration twice does not error', () => {
    expect(() => db.exec(migration004.up)).not.toThrow();
  });

  it('has version 4', () => {
    expect(migration004.version).toBe(4);
  });

  it('rejects invalid transaction type', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO transactions (id,type,amount,currency,egp_amount,account_id,
         transaction_date,transaction_time,created_at,updated_at)
         VALUES ('t1','invalid_type',100,'EGP',100,'acc1','2026-01-01','12:00:00',?,?)`,
      ).run(now, now);
    }).toThrow();
  });

  it('rejects amount <= 0', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO transactions (id,type,amount,currency,egp_amount,account_id,
         transaction_date,transaction_time,created_at,updated_at)
         VALUES ('t2','expense',-10,'EGP',-10,'acc1','2026-01-01','12:00:00',?,?)`,
      ).run(now, now);
    }).toThrow();
  });
});

describe('migration005 — to_amount and minimum_payment_snapshot columns', () => {
  it('adds to_amount column to transactions', () => {
    const cols = db.prepare("PRAGMA table_info('transactions')").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    expect(names).toContain('to_amount');
  });

  it('adds minimum_payment_snapshot column to transactions', () => {
    const cols = db.prepare("PRAGMA table_info('transactions')").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    expect(names).toContain('minimum_payment_snapshot');
  });

  it('has version 5', () => {
    expect(migration005.version).toBe(5);
  });

  it('allows inserting a transaction row with the new columns', () => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO accounts (id,name,type,currency,opening_balance,current_balance,
       interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc_m5','Test','bank','EGP',0,0,0,0,0,?,?)`,
    ).run(now, now);
    expect(() =>
      db
        .prepare(
          `INSERT INTO transactions
         (id,type,amount,currency,egp_amount,to_amount,minimum_payment_snapshot,
          account_id,transaction_date,transaction_time,created_at,updated_at)
         VALUES ('t_m5','expense',100,'EGP',100,NULL,NULL,'acc_m5','2026-01-01','12:00:00',?,?)`,
        )
        .run(now, now),
    ).not.toThrow();
  });
});

describe('migration018 — exact revolving balance delta', () => {
  it('adds the nullable revolving_balance_delta column', () => {
    const cols = db.prepare("PRAGMA table_info('transactions')").all() as { name: string }[];

    expect(cols.map((column) => column.name)).toContain('revolving_balance_delta');
  });

  it('has version 18', () => {
    expect(migration018.version).toBe(18);
  });

  it('leaves legacy payments null when their exact capped delta cannot be reconstructed', () => {
    const legacyDb = new Database(':memory:');
    openDbs.push(legacyDb);
    legacyDb.exec(
      MIGRATIONS.filter((migration) => migration.version < 18)
        .map((migration) => migration.up)
        .join('\n'),
    );
    const now = new Date().toISOString();
    legacyDb
      .prepare(
        `INSERT INTO accounts (id,name,type,currency,opening_balance,current_balance,
         interest_tracking,is_archived,sort_order,created_at,updated_at)
         VALUES ('asset','Asset','bank','EGP',1000,1000,0,0,0,?,?),
                ('card','Card','credit_card','EGP',0,300,0,0,1,?,?)`,
      )
      .run(now, now, now, now);
    legacyDb
      .prepare(
        `INSERT INTO transactions
         (id,type,amount,currency,egp_amount,to_amount,minimum_payment_snapshot,
          account_id,to_account_id,transaction_date,transaction_time,created_at,updated_at)
         VALUES ('payment','cc_payment',200,'EGP',200,200,50,
                 'asset','card','2026-01-01','12:00:00',?,?)`,
      )
      .run(now, now);

    legacyDb.exec(migration018.up);

    const row = legacyDb
      .prepare('SELECT revolving_balance_delta FROM transactions WHERE id = ?')
      .get('payment') as { revolving_balance_delta: number | null };
    expect(row.revolving_balance_delta).toBeNull();
  });
});
