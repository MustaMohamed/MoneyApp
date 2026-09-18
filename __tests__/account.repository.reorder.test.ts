import Database from 'better-sqlite3';

import { AccountType, Currency } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import * as accountsDb from '@/modules/accounts/database/accounts';
import { setAccountSortOrder } from '@/modules/accounts/database/accounts';
import { AccountReorderInvalidError } from '@/modules/accounts/repositories/account.errors';
import { AccountRepository } from '@/modules/accounts/repositories/account.repository';
import { bridgeBetterSQLite, getExpoSQLiteTestDatabase } from '@/test_helpers/sqlite';

const sqlite = getExpoSQLiteTestDatabase();
let realDb: ReturnType<typeof Database>;

const repo = new AccountRepository();

type AccountRow = Record<string, unknown> & { id: string; sort_order: number };

interface SeedRow {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  creditLimit: number | null;
  revolvingBalance: number | null;
  balanceReviewRequired: 0 | 1;
  isArchived: 0 | 1;
  isDeleted: 0 | 1;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const SEED: SeedRow[] = [
  {
    id: 'a',
    name: 'Main',
    type: AccountType.Bank,
    openingBalance: 1000,
    currentBalance: 1250.5,
    creditLimit: null,
    revolvingBalance: null,
    balanceReviewRequired: 0,
    isArchived: 0,
    isDeleted: 0,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'b',
    name: 'Spare',
    type: AccountType.SmartWallet,
    openingBalance: 200,
    currentBalance: 180,
    creditLimit: null,
    revolvingBalance: null,
    balanceReviewRequired: 1,
    isArchived: 0,
    isDeleted: 0,
    sortOrder: 0,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-05T00:00:00.000Z',
  },
  {
    id: 'c',
    name: 'Card',
    type: AccountType.CreditCard,
    openingBalance: 0,
    currentBalance: 700,
    creditLimit: 5000,
    revolvingBalance: 300,
    balanceReviewRequired: 0,
    isArchived: 0,
    isDeleted: 0,
    sortOrder: 3,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-05T00:00:00.000Z',
  },
  {
    id: 'e',
    name: 'Cash',
    type: AccountType.PhysicalWallet,
    openingBalance: 50,
    currentBalance: 75,
    creditLimit: null,
    revolvingBalance: null,
    balanceReviewRequired: 0,
    isArchived: 0,
    isDeleted: 0,
    sortOrder: 7,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-05T00:00:00.000Z',
  },
  {
    id: 'x',
    name: 'Old Card',
    type: AccountType.Bank,
    openingBalance: 10,
    currentBalance: 20,
    creditLimit: null,
    revolvingBalance: null,
    balanceReviewRequired: 0,
    isArchived: 1,
    isDeleted: 0,
    sortOrder: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-05T00:00:00.000Z',
  },
  {
    id: 'd',
    name: '',
    type: AccountType.Bank,
    openingBalance: 30,
    currentBalance: 40,
    creditLimit: null,
    revolvingBalance: null,
    balanceReviewRequired: 0,
    isArchived: 1,
    isDeleted: 1,
    sortOrder: 2,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-05T00:00:00.000Z',
  },
];

function seed(): void {
  const insert = realDb.prepare(
    `INSERT INTO accounts
       (id, name, type, currency, opening_balance, current_balance, color, credit_limit,
        revolving_balance, interest_tracking, balance_review_required, is_archived, is_deleted,
        sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '#1B2B4B', ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
  );
  for (const row of SEED) {
    insert.run(
      row.id,
      row.name,
      row.type,
      Currency.EGP,
      row.openingBalance,
      row.currentBalance,
      row.creditLimit,
      row.revolvingBalance,
      row.balanceReviewRequired,
      row.isArchived,
      row.isDeleted,
      row.sortOrder,
      row.createdAt,
      row.updatedAt,
    );
  }
}

function allRows(): AccountRow[] {
  return realDb.prepare('SELECT * FROM accounts ORDER BY id').all() as AccountRow[];
}

function positions(): Record<string, number> {
  return Object.fromEntries(allRows().map((row) => [row.id, row.sort_order]));
}

function withoutSortOrder(rows: AccountRow[]): Record<string, unknown>[] {
  return rows.map(({ sort_order: _sortOrder, ...rest }) => rest);
}

const SEEDED_POSITIONS = { a: 0, b: 0, c: 3, e: 7, x: 1, d: 2 };

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  bridgeBetterSQLite(sqlite, realDb);
  sqlite.withTransactionAsync.mockImplementation(async (task: () => Promise<void>) => {
    realDb.exec('BEGIN');
    try {
      await task();
      realDb.exec('COMMIT');
    } catch (error) {
      realDb.exec('ROLLBACK');
      throw error;
    }
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM accounts');
  seed();
  sqlite.withTransactionAsync.mockClear();
  sqlite.runAsync.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

describe('setAccountSortOrder — one active row, its position only', () => {
  it('reports one change on an active row and changes nothing but its position', async () => {
    const before = allRows();

    await expect(setAccountSortOrder(sqlite.database, 'c', 9)).resolves.toBe(1);

    const after = allRows();
    expect(withoutSortOrder(after)).toEqual(withoutSortOrder(before));
    expect(positions()).toEqual({ ...SEEDED_POSITIONS, c: 9 });
  });

  it.each(['x', 'd', 'missing'])(
    'reports no change on %s and leaves every row alone',
    async (id) => {
      const before = allRows();

      await expect(setAccountSortOrder(sqlite.database, id, 9)).resolves.toBe(0);

      expect(allRows()).toEqual(before);
    },
  );
});

describe('AccountRepository.reorder — the new order is stored and read back', () => {
  it('stores 0 to n-1 in the order given and every ordered reader returns it', async () => {
    await repo.reorder(['e', 'c', 'b', 'a']);

    expect(positions()).toEqual({ ...SEEDED_POSITIONS, e: 0, c: 1, b: 2, a: 3 });
    expect((await repo.getAll()).map((account) => account.id)).toEqual(['e', 'c', 'b', 'a']);
    const lookup = await repo.getByIdsIncludingArchived(['a', 'b', 'c', 'e']);
    expect(lookup.map((account) => account.id)).toEqual(['e', 'c', 'b', 'a']);
  });

  it('reads the same order through a fresh repository over the same database', async () => {
    await repo.reorder(['e', 'c', 'b', 'a']);

    const relaunched = await new AccountRepository().getAll();
    expect(relaunched.map((account) => account.id)).toEqual(['e', 'c', 'b', 'a']);
  });

  it('collapses the seeded gaps and the duplicate on the first write', async () => {
    await repo.reorder(['b', 'a', 'c', 'e']);

    expect(positions()).toEqual({ ...SEEDED_POSITIONS, b: 0, a: 1, c: 2, e: 3 });
    expect((await repo.getAll()).map((account) => account.id)).toEqual(['b', 'a', 'c', 'e']);
  });

  it('changes only sort_order, and archived and deleted rows keep their positions', async () => {
    const before = allRows();

    await repo.reorder(['e', 'c', 'b', 'a']);

    expect(withoutSortOrder(allRows())).toEqual(withoutSortOrder(before));
    expect(positions()).toMatchObject({ x: 1, d: 2 });
  });
});

describe('AccountRepository.reorder — the current order writes nothing', () => {
  it('opens no transaction and runs no statement when handed the current order', async () => {
    const before = allRows();

    await expect(repo.reorder(['a', 'b', 'c', 'e'])).resolves.toBeUndefined();

    expect(sqlite.withTransactionAsync).not.toHaveBeenCalled();
    expect(sqlite.runAsync).not.toHaveBeenCalled();
    expect(allRows()).toEqual(before);
  });
});

describe('AccountRepository.reorder — a bad order is refused before any write', () => {
  it.each([
    ['omits an active account', ['a', 'b', 'c']],
    ['lists one twice', ['a', 'a', 'c', 'e']],
    ['names an archived account', ['a', 'b', 'c', 'x']],
    ['names a deleted account', ['a', 'b', 'c', 'd']],
    ['names an unknown account', ['a', 'b', 'c', 'nope']],
    ['is empty', []],
  ])('refuses an order that %s', async (_label, orderedIds) => {
    const before = allRows();

    await expect(repo.reorder(orderedIds)).rejects.toThrow(AccountReorderInvalidError);

    expect(sqlite.withTransactionAsync).not.toHaveBeenCalled();
    expect(allRows()).toEqual(before);
  });
});

describe('AccountRepository.reorder — atomicity over a real transaction', () => {
  it('rolls back the rows already written when a later write fails', async () => {
    const real = accountsDb.setAccountSortOrder;
    const failure = new Error('sort write failed');
    const spy = jest
      .spyOn(accountsDb, 'setAccountSortOrder')
      .mockImplementationOnce(real)
      .mockRejectedValueOnce(failure);

    await expect(repo.reorder(['e', 'c', 'b', 'a'])).rejects.toBe(failure);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, expect.anything(), 'e', 0);
    expect(positions()).toEqual(SEEDED_POSITIONS);
  });
});
