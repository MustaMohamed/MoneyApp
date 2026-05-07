import Database from 'better-sqlite3';
import { MIGRATIONS } from '@/database/migrations';

let db: ReturnType<typeof Database>;

beforeEach(() => {
  db = new Database(':memory:');
  // FK enforcement off — migration tests check schema structure, not FK logic
  db.pragma('foreign_keys = OFF');
  for (const m of MIGRATIONS) db.exec(m.up);
});

afterEach(() => db.close());

describe('migration006 — commitments table', () => {
  it('creates the commitments table', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='commitments'")
      .get();
    expect(row).toBeDefined();
  });

  it('has all expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('commitments')").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'id',
        'name',
        'amount_type',
        'amount',
        'currency',
        'category_id',
        'recurrence_every',
        'recurrence_period',
        'start_date',
        'account_id',
        'notes',
        'duration_type',
        'end_date',
        'end_after_count',
        'is_active',
        'created_at',
        'updated_at',
      ]),
    );
  });

  it('rejects invalid amount_type', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO commitments (id,name,amount_type,currency,category_id,recurrence_every,recurrence_period,start_date,duration_type,is_active,created_at,updated_at)
         VALUES ('c1','Rent','invalid','EGP','cat1',1,'months','2026-01-01','forever',1,?,?)`,
      ).run(now, now);
    }).toThrow();
  });

  it('rejects invalid recurrence_period', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO commitments (id,name,amount_type,currency,category_id,recurrence_every,recurrence_period,start_date,duration_type,is_active,created_at,updated_at)
         VALUES ('c1','Rent','fixed','EGP','cat1',1,'biweekly','2026-01-01','forever',1,?,?)`,
      ).run(now, now);
    }).toThrow();
  });

  it('rejects invalid duration_type', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO commitments (id,name,amount_type,currency,category_id,recurrence_every,recurrence_period,start_date,duration_type,is_active,created_at,updated_at)
         VALUES ('c1','Rent','fixed','EGP','cat1',1,'months','2026-01-01','quarterly',1,?,?)`,
      ).run(now, now);
    }).toThrow();
  });

  it('accepts a valid commitment row', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO commitments (id,name,amount_type,amount,currency,category_id,recurrence_every,recurrence_period,start_date,duration_type,is_active,created_at,updated_at)
         VALUES ('c1','Rent','fixed',5000,'EGP','cat1',1,'months','2026-01-01','forever',1,?,?)`,
      ).run(now, now);
    }).not.toThrow();
  });

  it('is idempotent — running twice does not error', () => {
    expect(() => db.exec(MIGRATIONS.find((m) => m.version === 6)!.up)).not.toThrow();
  });

  it('has version 6', () => {
    expect(MIGRATIONS.find((m) => m.version === 6)!.version).toBe(6);
  });
});

describe('migration007 — commitment_payments table', () => {
  it('creates the commitment_payments table', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='commitment_payments'")
      .get();
    expect(row).toBeDefined();
  });

  it('has all expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('commitment_payments')").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'id',
        'commitment_id',
        'due_date',
        'paid_date',
        'skipped_date',
        'amount_due',
        'amount_paid',
        'currency',
        'exchange_rate_snapshot',
        'account_id',
        'transaction_id',
        'status',
        'notes',
        'created_at',
        'updated_at',
      ]),
    );
  });

  it('creates expected indexes', () => {
    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='commitment_payments'",
      )
      .all() as { name: string }[];
    const names = indexes.map((i) => i.name);
    expect(names).toContain('idx_cp_commitment_id');
    expect(names).toContain('idx_cp_due_date');
    expect(names).toContain('idx_cp_status');
  });

  it('rejects invalid status', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO commitment_payments (id,commitment_id,due_date,currency,status,created_at,updated_at)
         VALUES ('cp1','c1','2026-05-01','EGP','invalid',?,?)`,
      ).run(now, now);
    }).toThrow();
  });

  it('accepts a valid payment row with nullable account_id', () => {
    const now = new Date().toISOString();
    // Insert parent commitment first
    db.prepare(
      `INSERT INTO commitments (id,name,amount_type,currency,category_id,recurrence_every,recurrence_period,start_date,duration_type,is_active,created_at,updated_at)
       VALUES ('c1','Rent','fixed','EGP','cat1',1,'months','2026-01-01','forever',1,?,?)`,
    ).run(now, now);
    expect(() => {
      db.prepare(
        `INSERT INTO commitment_payments (id,commitment_id,due_date,currency,account_id,status,created_at,updated_at)
         VALUES ('cp1','c1','2026-05-01','EGP',NULL,'upcoming',?,?)`,
      ).run(now, now);
    }).not.toThrow();
  });

  it('is idempotent', () => {
    expect(() => db.exec(MIGRATIONS.find((m) => m.version === 7)!.up)).not.toThrow();
  });

  it('has version 7', () => {
    expect(MIGRATIONS.find((m) => m.version === 7)!.version).toBe(7);
  });
});

describe('migration008 — commitment_payment_id column on transactions', () => {
  it('adds commitment_payment_id column', () => {
    const cols = db.prepare("PRAGMA table_info('transactions')").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    expect(names).toContain('commitment_payment_id');
  });

  it('has version 8', () => {
    expect(MIGRATIONS.find((m) => m.version === 8)!.version).toBe(8);
  });

  it('allows inserting a transaction with commitment_payment_id', () => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO accounts (id,name,type,currency,opening_balance,current_balance,interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc1','Test','bank','EGP',0,0,0,0,0,?,?)`,
    ).run(now, now);
    expect(() => {
      db.prepare(
        `INSERT INTO transactions (id,type,amount,currency,egp_amount,account_id,transaction_date,transaction_time,commitment_payment_id,created_at,updated_at)
         VALUES ('t1','expense',100,'EGP',100,'acc1','2026-01-01','12:00:00','cp1',?,?)`,
      ).run(now, now);
    }).not.toThrow();
  });
});
