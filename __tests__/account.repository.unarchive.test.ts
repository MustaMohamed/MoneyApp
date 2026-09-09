import Database from 'better-sqlite3';

import { AccountType, Currency } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { setAccountUnarchived } from '@/modules/accounts/database/accounts';
import {
  AccountNameTakenError,
  AccountNotArchivedError,
  AccountNotFoundError,
} from '@/modules/accounts/repositories/account.errors';
import { AccountRepository } from '@/modules/accounts/repositories/account.repository';
import { getExpoSQLiteTestDatabase, getSQLiteParams } from '@/test_helpers/sqlite';

const sqlite = getExpoSQLiteTestDatabase();
let realDb: ReturnType<typeof Database>;

const NOW = '2026-09-08T00:00:00.000Z';
const LATER = '2026-09-09T00:00:00.000Z';

const repo = new AccountRepository();

interface PositionRow {
  is_archived: number;
  sort_order: number;
  updated_at: string;
}

function positionOf(id: string): PositionRow {
  return realDb
    .prepare('SELECT is_archived, sort_order, updated_at FROM accounts WHERE id = ?')
    .get(id) as PositionRow;
}

function insertAccount(
  id: string,
  name: string,
  sortOrder: number,
  isArchived: 0 | 1,
  isDeleted: 0 | 1,
  createdAt: string,
): void {
  realDb
    .prepare(
      `INSERT INTO accounts
         (id, name, type, currency, opening_balance, current_balance, interest_tracking,
          is_archived, is_deleted, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      name,
      AccountType.Bank,
      Currency.EGP,
      isArchived,
      isDeleted,
      sortOrder,
      createdAt,
      NOW,
    );
}

// `react-native-uuid` is mocked to one fixed id, so every row is inserted directly.
function seed(): void {
  insertAccount('a', 'Main', 0, 0, 0, '2026-01-01T00:00:00.000Z');
  insertAccount('b', 'Spare', 5, 0, 0, '2026-01-01T00:00:00.000Z');
  insertAccount('z', 'Old Wallet', 1, 1, 0, '2026-02-01T00:00:00.000Z');
  insertAccount('x', 'Old Card', 1, 1, 0, '2026-01-01T00:00:00.000Z');
  insertAccount('y', 'Old Card', 0, 1, 0, '2026-03-01T00:00:00.000Z');
  insertAccount('d', '', 2, 1, 1, '2026-01-01T00:00:00.000Z');
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  sqlite.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const result = realDb.prepare(sql).run(...getSQLiteParams(rest));
    return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
  });
  sqlite.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) =>
    realDb.prepare(sql).all(...getSQLiteParams(rest)),
  );
});

beforeEach(() => {
  realDb.exec('DELETE FROM accounts');
  seed();
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

describe('AccountRepository.unarchive — the write and the sort position', () => {
  it('clears the flag and seats the account after every active one', async () => {
    await repo.unarchive('x');

    const row = positionOf('x');
    expect(row.is_archived).toBe(0);
    expect(row.sort_order).toBe(6);
    expect(row.updated_at).not.toBe(NOW);

    const listed = await repo.getAll();
    expect(listed.map((account) => account.id)).toEqual(['a', 'b', 'x']);
  });

  it('seats the account at 0 when no active account is left', async () => {
    realDb.exec("DELETE FROM accounts WHERE id IN ('a', 'b')");

    await repo.unarchive('x');

    expect(positionOf('x')).toMatchObject({ is_archived: 0, sort_order: 0 });
  });
});

describe('AccountRepository.unarchive — the three refusals', () => {
  it('refuses an id that resolves to nothing', async () => {
    await expect(repo.unarchive('missing')).rejects.toThrow(AccountNotFoundError);
  });

  it('refuses a deleted account', async () => {
    await expect(repo.unarchive('d')).rejects.toThrow(AccountNotFoundError);
    expect(positionOf('d')).toEqual({ is_archived: 1, sort_order: 2, updated_at: NOW });
  });

  it('refuses an account that is not archived, and does not move it', async () => {
    await expect(repo.unarchive('a')).rejects.toThrow(AccountNotArchivedError);
    expect(positionOf('a')).toEqual({ is_archived: 0, sort_order: 0, updated_at: NOW });
  });

  it('refuses a name an active account already holds, trimmed and case-insensitively', async () => {
    insertAccount('c', ' old card ', 7, 0, 0, '2026-01-01T00:00:00.000Z');

    await expect(repo.unarchive('x')).rejects.toThrow(AccountNameTakenError);
    expect(positionOf('x')).toEqual({ is_archived: 1, sort_order: 1, updated_at: NOW });
  });

  it('lets an archived namesake through, then refuses it once the first is active', async () => {
    await repo.unarchive('x');

    await expect(repo.unarchive('y')).rejects.toThrow(AccountNameTakenError);
    expect(positionOf('y')).toMatchObject({ is_archived: 1, sort_order: 0 });
  });
});

describe('setAccountUnarchived — a zero row count is itself a refusal', () => {
  it('reports no change on an active row and leaves it where it was', async () => {
    await expect(setAccountUnarchived(sqlite.database, 'a', LATER)).resolves.toBe(0);
    expect(positionOf('a')).toEqual({ is_archived: 0, sort_order: 0, updated_at: NOW });
  });

  it('reports no change on a deleted row', async () => {
    await expect(setAccountUnarchived(sqlite.database, 'd', LATER)).resolves.toBe(0);
    expect(positionOf('d')).toEqual({ is_archived: 1, sort_order: 2, updated_at: NOW });
  });
});

describe('AccountRepository.getArchived', () => {
  it('lists the archived accounts by sort position then creation time, the reverse of the z, x, y insertion order, never a deleted one', async () => {
    const archived = await repo.getArchived();

    expect(archived.map((account) => account.id)).toEqual(['y', 'x', 'z']);
  });

  it('returns an empty list when nothing is archived', async () => {
    realDb.exec('DELETE FROM accounts WHERE is_archived = 1');

    await expect(repo.getArchived()).resolves.toEqual([]);
  });
});

describe('an archived account reaches no total, carousel or picker', () => {
  it('leaves the active list on archive and rejoins it on restore', async () => {
    await repo.archive('a');
    expect((await repo.getAll()).map((account) => account.id)).toEqual(['b']);

    await repo.unarchive('a');

    expect((await repo.getAll()).map((account) => account.id)).toEqual(['b', 'a']);
  });
});
