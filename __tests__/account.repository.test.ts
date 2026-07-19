// TC-09 / TC-10 / TC-11 / TC-12 — AccountRepository owns UUID generation,
// timestamp stamping, field defaults, and query delegation.

import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { AccountType, Currency } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { AccountRepository } from '@/repositories/account.repository';
import type { NewAccountInput } from '@/repositories/account.repository';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

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
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 1 };
  });

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });

  mocked.execAsync.mockImplementation(async (sql: string) => {
    realDb.exec(sql);
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM accounts');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const baseInput: NewAccountInput = {
  name: 'CIB Savings',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 12500,
  color: '#1B2B4B',
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  sort_order: 0,
};

const repo = new AccountRepository();

describe('AccountRepository.add — TC-09', () => {
  it('sets current_balance = opening_balance', async () => {
    await repo.add({ ...baseInput, opening_balance: 5000 });
    const row = realDb.prepare('SELECT * FROM accounts').get() as Record<string, unknown>;
    expect(row.current_balance).toBe(5000);
    expect(row.opening_balance).toBe(5000);
  });

  it('forces is_archived to 0', async () => {
    await repo.add(baseInput);
    const row = realDb.prepare('SELECT is_archived FROM accounts').get() as {
      is_archived: number;
    };
    expect(row.is_archived).toBe(0);
  });

  it('writes a UUID-shaped id', async () => {
    await repo.add(baseInput);
    const row = realDb.prepare('SELECT id FROM accounts').get() as { id: string };
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('writes ISO 8601 created_at / updated_at timestamps', async () => {
    await repo.add(baseInput);
    const row = realDb.prepare('SELECT created_at, updated_at FROM accounts').get() as {
      created_at: string;
      updated_at: string;
    };
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('returns the persisted Account with generated fields', async () => {
    const account = await repo.add(baseInput);
    expect(account.name).toBe('CIB Savings');
    expect(account.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(account.current_balance).toBe(12500);
    expect(account.is_archived).toBe(0);
    expect(account.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it.each([
    AccountType.Bank,
    AccountType.SmartWallet,
    AccountType.PhysicalWallet,
    AccountType.PhysicalSavings,
    AccountType.CreditCard,
  ])('persists type %s exactly — TC-09', async (type) => {
    realDb.exec('DELETE FROM accounts');
    await repo.add({
      ...baseInput,
      name: `acct-${type}`,
      type,
      credit_limit: type === AccountType.CreditCard ? 5000 : null,
    });
    const row = realDb.prepare('SELECT type FROM accounts').get() as { type: string };
    expect(row.type).toBe(type);
  });
});

describe('AccountRepository.add credit-card fields — TC-10', () => {
  it('writes CC fields with interest tracking OFF (apr stays NULL)', async () => {
    await repo.add({
      ...baseInput,
      name: 'Visa Card',
      type: AccountType.CreditCard,
      revolving_balance: 5000,
      credit_limit: 20000,
      minimum_payment: null,
      statement_due_day: null,
      interest_tracking: 0,
      apr: null,
    });
    const row = realDb.prepare('SELECT * FROM accounts').get() as Record<string, unknown>;
    expect(row.type).toBe(AccountType.CreditCard);
    expect(row.interest_tracking).toBe(0);
    expect(row.apr).toBeNull();
    expect(row.revolving_balance).toBe(5000);
    expect(row.credit_limit).toBe(20000);
  });

  it('writes apr when interest tracking is ON', async () => {
    await repo.add({
      ...baseInput,
      name: 'Visa Plus',
      type: AccountType.CreditCard,
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

describe('AccountRepository.add color — TC-11', () => {
  it('persists the selected color hex string', async () => {
    await repo.add({ ...baseInput, color: '#3D7A5F' });
    const row = realDb.prepare('SELECT color FROM accounts').get() as { color: string };
    expect(row.color).toBe('#3D7A5F');
  });
});

describe('AccountRepository.update — TC-M15-01', () => {
  it('updates name and color', async () => {
    await repo.add({ ...baseInput, name: 'Before' });
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;

    await repo.update(id, { name: 'After', color: '#3D7A5F' });

    const row = realDb.prepare('SELECT name, color FROM accounts WHERE id = ?').get(id) as {
      name: string;
      color: string;
    };
    expect(row.name).toBe('After');
    expect(row.color).toBe('#3D7A5F');
  });

  it('updates updated_at timestamp', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    const before = (
      realDb.prepare('SELECT updated_at FROM accounts WHERE id = ?').get(id) as {
        updated_at: string;
      }
    ).updated_at;

    await new Promise((r) => setTimeout(r, 10));
    await repo.update(id, { name: 'X', color: null });

    const after = (
      realDb.prepare('SELECT updated_at FROM accounts WHERE id = ?').get(id) as {
        updated_at: string;
      }
    ).updated_at;
    expect(after).not.toBe(before);
  });
});

describe('AccountRepository.archive — TC-M15-02', () => {
  it('sets is_archived = 1', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;

    await repo.archive(id);

    const row = realDb.prepare('SELECT is_archived FROM accounts WHERE id = ?').get(id) as {
      is_archived: number;
    };
    expect(row.is_archived).toBe(1);
  });

  it('does not delete the row', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    await repo.archive(id);
    expect(realDb.prepare('SELECT id FROM accounts WHERE id = ?').get(id)).toBeDefined();
  });

  it('getAll no longer returns archived account', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    await repo.archive(id);
    const all = await repo.getAll();
    expect(all.find((a) => a.id === id)).toBeUndefined();
  });

  it('getByIdsIncludingArchived resolves archived accounts for history display', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    await repo.archive(id);

    const rows = await repo.getByIdsIncludingArchived([id]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id, is_archived: 1 });
  });

  it('getByIdIncludingArchived resolves one archived account', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    await repo.archive(id);

    await expect(repo.getByIdIncludingArchived(id)).resolves.toMatchObject({ id, is_archived: 1 });
    await expect(repo.getByIdIncludingArchived('missing')).resolves.toBeUndefined();
  });

  it('updates updated_at timestamp on archive', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    const before = (
      realDb.prepare('SELECT updated_at FROM accounts WHERE id = ?').get(id) as {
        updated_at: string;
      }
    ).updated_at;
    await new Promise((r) => setTimeout(r, 10));
    await repo.archive(id);
    const after = (
      realDb.prepare('SELECT updated_at FROM accounts WHERE id = ?').get(id) as {
        updated_at: string;
      }
    ).updated_at;
    expect(after).not.toBe(before);
  });
});

describe('AccountRepository.adjustBalance — TC-M15-03', () => {
  it('updates current_balance to the new value', async () => {
    await repo.add({ ...baseInput, opening_balance: 1000 });
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;

    await repo.adjustBalance(id, 9999);

    const row = realDb.prepare('SELECT current_balance FROM accounts WHERE id = ?').get(id) as {
      current_balance: number;
    };
    expect(row.current_balance).toBe(9999);
  });

  it('does not change opening_balance', async () => {
    await repo.add({ ...baseInput, opening_balance: 1000 });
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    await repo.adjustBalance(id, 500);
    const row = realDb.prepare('SELECT opening_balance FROM accounts WHERE id = ?').get(id) as {
      opening_balance: number;
    };
    expect(row.opening_balance).toBe(1000);
  });

  it('updates updated_at timestamp on adjustBalance', async () => {
    await repo.add({ ...baseInput, opening_balance: 500 });
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    const before = (
      realDb.prepare('SELECT updated_at FROM accounts WHERE id = ?').get(id) as {
        updated_at: string;
      }
    ).updated_at;
    await new Promise((r) => setTimeout(r, 10));
    await repo.adjustBalance(id, 999);
    const after = (
      realDb.prepare('SELECT updated_at FROM accounts WHERE id = ?').get(id) as {
        updated_at: string;
      }
    ).updated_at;
    expect(after).not.toBe(before);
  });
});

describe('AccountRepository.getAll ordering — TC-12', () => {
  it('returns non-archived rows ordered by sort_order asc, created_at asc', async () => {
    const insert = realDb.prepare(`
      INSERT INTO accounts (
        id, name, type, currency, opening_balance, current_balance,
        color, credit_limit, revolving_balance, minimum_payment,
        statement_due_day, interest_tracking, apr,
        is_archived, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      'a',
      'Third',
      AccountType.Bank,
      Currency.EGP,
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
      AccountType.Bank,
      Currency.EGP,
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
      AccountType.Bank,
      Currency.EGP,
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
      AccountType.Bank,
      Currency.EGP,
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

    const accounts = await repo.getAll();
    expect(accounts.map((a) => a.name)).toEqual(['First', 'Second', 'Third']);
  });
});
