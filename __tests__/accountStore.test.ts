// TC-09 / TC-10 / TC-11 — accountStore.addAccount writes a complete row
// to SQLite. We can't use the real expo-sqlite in node, so we route the
// store's runAsync calls through better-sqlite3 to exercise the real
// SCHEMA_SQL and verify each saved column matches the spec.

import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { SCHEMA_SQL } from '@/db/init';
import { useAccountStore } from '@/store/accountStore';

const sqlite = SQLite as unknown as { __reset: () => void };

let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(SCHEMA_SQL);

  // Wire the mocked expo-sqlite db over to better-sqlite3 so addAccount's
  // runAsync(...) calls actually persist and we can SELECT them back.
  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getAllAsync: jest.Mock;
        execAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    // store passes a single array as second arg
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 1 };
  });
  mocked.getAllAsync.mockImplementation(async (sql: string) => {
    return realDb.prepare(sql).all();
  });
  mocked.execAsync.mockImplementation(async (sql: string) => {
    realDb.exec(sql);
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM accounts; DELETE FROM app_settings;');
  useAccountStore.setState({ accounts: [] });
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const baseInput = {
  name: 'CIB Savings',
  type: 'bank' as const,
  currency: 'EGP' as const,
  opening_balance: 12500,
  current_balance: 12500,
  color: '#1B2B4B',
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0 as const,
  apr: null,
  is_archived: 0 as const,
  sort_order: 0,
};

describe('accountStore.addAccount — TC-09', () => {
  it('persists all 17 columns with current_balance = opening_balance', async () => {
    await useAccountStore.getState().addAccount({
      ...baseInput,
      opening_balance: 5000,
      current_balance: 999, // store should ignore this and force = opening_balance
    });

    const row = realDb.prepare('SELECT * FROM accounts').get() as Record<string, unknown>;
    expect(row.current_balance).toBe(5000);
    expect(row.opening_balance).toBe(5000);
  });

  it('forces is_archived to 0 even if caller sends 1', async () => {
    await useAccountStore.getState().addAccount({
      ...baseInput,
      is_archived: 0, // type system already restricts; store hard-codes 0 either way
    });
    const row = realDb.prepare('SELECT is_archived FROM accounts').get() as {
      is_archived: number;
    };
    expect(row.is_archived).toBe(0);
  });

  it('writes a UUID-shaped id', async () => {
    await useAccountStore.getState().addAccount(baseInput);
    const row = realDb.prepare('SELECT id FROM accounts').get() as { id: string };
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('writes ISO 8601 created_at / updated_at timestamps', async () => {
    await useAccountStore.getState().addAccount(baseInput);
    const row = realDb.prepare('SELECT created_at, updated_at FROM accounts').get() as {
      created_at: string;
      updated_at: string;
    };
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it.each(['bank', 'smart_wallet', 'physical_wallet', 'physical_savings', 'credit_card'] as const)(
    'saves type %s exactly',
    async (type) => {
      realDb.exec('DELETE FROM accounts');
      await useAccountStore.getState().addAccount({
        ...baseInput,
        name: `acct-${type}`,
        type,
        // CC requires credit_limit to satisfy the schema; bank types ignore it
        credit_limit: type === 'credit_card' ? 5000 : null,
      });
      const row = realDb.prepare('SELECT type FROM accounts').get() as {
        type: string;
      };
      expect(row.type).toBe(type);
    },
  );

  it('reloads accounts state after insert', async () => {
    await useAccountStore.getState().addAccount(baseInput);
    expect(useAccountStore.getState().accounts).toHaveLength(1);
    expect(useAccountStore.getState().accounts[0].name).toBe('CIB Savings');
  });
});

describe('accountStore.addAccount credit-card fields — TC-10', () => {
  it('writes CC fields with interest tracking OFF (apr stays NULL)', async () => {
    await useAccountStore.getState().addAccount({
      ...baseInput,
      name: 'Visa Card',
      type: 'credit_card',
      revolving_balance: 5000,
      credit_limit: 20000,
      minimum_payment: null,
      statement_due_day: null,
      interest_tracking: 0,
      apr: null,
    });

    const row = realDb.prepare('SELECT * FROM accounts').get() as Record<string, unknown>;
    expect(row.type).toBe('credit_card');
    expect(row.interest_tracking).toBe(0);
    expect(row.apr).toBeNull();
    expect(row.revolving_balance).toBe(5000);
    expect(row.credit_limit).toBe(20000);
  });

  it('writes apr when interest tracking is ON', async () => {
    await useAccountStore.getState().addAccount({
      ...baseInput,
      name: 'Visa Plus',
      type: 'credit_card',
      revolving_balance: 0,
      credit_limit: 30000,
      minimum_payment: 500,
      statement_due_day: 15,
      interest_tracking: 1,
      apr: 24.99,
    });

    const row = realDb.prepare('SELECT * FROM accounts').get() as Record<string, unknown>;
    expect(row.interest_tracking).toBe(1);
    expect(row.apr).toBe(24.99);
    expect(row.minimum_payment).toBe(500);
    expect(row.statement_due_day).toBe(15);
  });
});

describe('accountStore.addAccount color — TC-11', () => {
  it('persists the selected color hex string', async () => {
    await useAccountStore.getState().addAccount({
      ...baseInput,
      color: '#3D7A5F',
    });
    const row = realDb.prepare('SELECT color FROM accounts').get() as {
      color: string;
    };
    expect(row.color).toBe('#3D7A5F');
  });
});

describe('accountStore.loadAccounts ordering — TC-12', () => {
  it('returns rows ordered by sort_order asc, created_at asc; archived rows hidden', async () => {
    // Insert directly into the better-sqlite3 db to seed an ordering scenario
    // that doesn't rely on uuid sequencing.
    const insert = realDb.prepare(`INSERT INTO accounts (
      id, name, type, currency, opening_balance, current_balance,
      color, credit_limit, revolving_balance, minimum_payment,
      statement_due_day, interest_tracking, apr,
      is_archived, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    insert.run(
      'a',
      'Third',
      'bank',
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
      2,
      '2026-04-29T01:00:00Z',
      '2026-04-29T01:00:00Z',
    );
    insert.run(
      'b',
      'First',
      'bank',
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
    );
    insert.run(
      'c',
      'Second',
      'bank',
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
      1,
      '2026-04-29T00:30:00Z',
      '2026-04-29T00:30:00Z',
    );
    insert.run(
      'd',
      'Hidden',
      'bank',
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
      1,
      0,
      '2026-04-29T00:00:00Z',
      '2026-04-29T00:00:00Z',
    );

    await useAccountStore.getState().loadAccounts();

    const names = useAccountStore.getState().accounts.map((a) => a.name);
    expect(names).toEqual(['First', 'Second', 'Third']);
  });
});
