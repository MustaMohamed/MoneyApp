import Database from 'better-sqlite3';
import { MIGRATIONS } from '@/database/migrations';

let db: ReturnType<typeof Database>;

beforeEach(() => {
  db = new Database(':memory:');
  // FK enforcement off — migration tests check schema structure, not FK logic
  db.pragma('foreign_keys = OFF');
  // Run all migrations up to and including 006
  for (const m of MIGRATIONS) {
    if (m.version <= 6) db.exec(m.up);
  }
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
