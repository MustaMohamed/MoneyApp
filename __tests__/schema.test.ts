import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';

const SCHEMA_SQL = MIGRATIONS.map((m) => m.up).join('\n');

// expo-sqlite is unreachable from tests, so the shipped DDL runs on in-memory better-sqlite3.

const openDbs: ReturnType<typeof Database>[] = [];

function withDb(): ReturnType<typeof Database> {
  const db = new Database(':memory:');
  openDbs.push(db);
  db.exec(SCHEMA_SQL);
  return db;
}

// afterEach, not afterAll: a test that throws mid-body would otherwise strand its handles.
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
  // The expect covers both lists; the throws below only preserve stack fidelity on failure.
  const stranded = drained.flatMap((db, i) => (db.open ? [i] : []));
  expect({ stranded, closeErrors: closeFailures.map(String) }).toEqual({
    stranded: [],
    closeErrors: [],
  });
  if (closeFailures.length === 1) throw closeFailures[0];
  if (closeFailures.length > 1) throw new AggregateError(closeFailures);
});

const VALID_INSERT = `
  INSERT INTO accounts (
    id, name, type, currency,
    opening_balance, current_balance,
    color, credit_limit, revolving_balance, minimum_payment,
    statement_due_day, interest_tracking, apr,
    is_archived, sort_order, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

describe('database schema — TC-15', () => {
  it('creates exactly the expected tables and no others', () => {
    const db = withDb();
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual([
      'accounts',
      'app_settings',
      'budget_month_category_groups',
      'budget_month_settings',
      'budgets',
      'categories',
      'commitment_payments',
      'commitments',
      'spending_plan_categories',
      'spending_plans',
      'transactions',
    ]);
  });

  it('accounts table has exactly 18 columns in migration order', () => {
    const db = withDb();
    const cols = db.prepare("PRAGMA table_info('accounts')").all() as {
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];
    expect(cols.map((c) => c.name)).toEqual([
      'id',
      'name',
      'type',
      'currency',
      'opening_balance',
      'current_balance',
      'color',
      'credit_limit',
      'revolving_balance',
      'minimum_payment',
      'statement_due_day',
      'interest_tracking',
      'apr',
      'is_archived',
      'sort_order',
      'created_at',
      'updated_at',
      'balance_review_required',
    ]);
    expect(cols).toHaveLength(18);
  });

  it('app_settings is a 2-column key/value store', () => {
    const db = withDb();
    const cols = db.prepare("PRAGMA table_info('app_settings')").all() as {
      name: string;
    }[];
    expect(cols.map((c) => c.name)).toEqual(['key', 'value']);
  });

  it('valid type + currency insert succeeds', () => {
    const db = withDb();
    expect(() =>
      db
        .prepare(VALID_INSERT)
        .run(
          'id1',
          'CIB Savings',
          'bank',
          'EGP',
          1000,
          1000,
          '#1B2B4B',
          null,
          null,
          null,
          null,
          0,
          null,
          0,
          0,
          '2026-04-29T00:00:00Z',
          '2026-04-29T00:00:00Z',
        ),
    ).not.toThrow();
  });

  it('invalid type rejects with CHECK constraint error', () => {
    const db = withDb();
    expect(() =>
      db
        .prepare(VALID_INSERT)
        .run(
          'id2',
          'X',
          'savings_account',
          'EGP',
          0,
          0,
          null,
          null,
          null,
          null,
          null,
          0,
          null,
          0,
          0,
          '2026-04-29T00:00:00Z',
          '2026-04-29T00:00:00Z',
        ),
    ).toThrow(/CHECK constraint failed/);
  });

  it('invalid currency rejects with CHECK constraint error', () => {
    const db = withDb();
    expect(() =>
      db
        .prepare(VALID_INSERT)
        .run(
          'id3',
          'X',
          'bank',
          'GBP',
          0,
          0,
          null,
          null,
          null,
          null,
          null,
          0,
          null,
          0,
          0,
          '2026-04-29T00:00:00Z',
          '2026-04-29T00:00:00Z',
        ),
    ).toThrow(/CHECK constraint failed/);
  });

  it('all 5 spec types are accepted', () => {
    const db = withDb();
    const types = ['bank', 'smart_wallet', 'physical_wallet', 'physical_savings', 'credit_card'];
    types.forEach((t, i) => {
      expect(() =>
        db
          .prepare(VALID_INSERT)
          .run(
            `id-${i}`,
            `acct-${i}`,
            t,
            'EGP',
            0,
            0,
            null,
            null,
            null,
            null,
            null,
            0,
            null,
            0,
            0,
            '2026-04-29T00:00:00Z',
            '2026-04-29T00:00:00Z',
          ),
      ).not.toThrow();
    });
  });
});
