import Database from 'better-sqlite3';
import { MIGRATIONS } from '@/database/migrations';
import { migration004 } from '@/database/migrations/004_create_transactions';

let db: ReturnType<typeof Database>;

beforeEach(() => {
  db = new Database(':memory:');
  db.exec(MIGRATIONS.map((m) => m.up).join('\n'));
});

afterEach(() => db.close());

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
