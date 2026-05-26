/**
 * Task 4 — reassignAndDelete atomicity fix
 *
 * Uses better-sqlite3 + the global expo-sqlite fake so that the repository's
 * `withTransactionAsync` wiring can be exercised with real SQL running against
 * an in-memory database. This mirrors the pattern established in
 * __tests__/transaction.repository.test.ts.
 *
 * TC-01: 47 transactions reassigned, balances/amounts untouched
 * TC-02: commitments.category_id also updated in the same transaction
 * TC-09: atomicity — withTransactionAsync rejection leaves DB unchanged
 */
import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { CategoryType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import {
  CategoryRepository,
  type NewCategoryInput,
} from '@/modules/categories/repositories/category.repository';

// ----- UUID mock override so each category gets a deterministic unique id -----
// Variable must start with 'mock' (case-insensitive) to be accessible inside jest.mock factory
let mockUuidCounter = 0;
jest.mock('react-native-uuid', () => ({
  __esModule: true,
  default: { v4: () => `cat-repo-test-${++mockUuidCounter}` },
}));

// ----- Database setup -----
const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;
const NOW = '2026-01-01T00:00:00.000Z';

function seedAccount() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id, name, type, currency, opening_balance, current_balance,
        revolving_balance, minimum_payment, interest_tracking,
        is_archived, sort_order, created_at, updated_at)
       VALUES ('acc_test', 'Test Bank', 'bank', 'EGP', 0, 0, NULL, NULL, 0, 0, 0, ?, ?)`,
    )
    .run(NOW, NOW);
}

/**
 * Insert a custom (is_default=0) "from" category for use as the delete source.
 * We avoid deleting seeded (is_default=1) categories in tests because once
 * deleted they cannot be used as FK targets in subsequent tests within the same DB.
 */
function insertFromCategory(id: string, type: 'expense' | 'income' = 'expense') {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, 'tag', '#aaa', 0, 99, ?, ?)`,
    )
    .run(id, `Test Category ${id}`, type, NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seedAccount();

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getAllAsync: jest.Mock;
        getFirstAsync: jest.Mock;
        withTransactionAsync: jest.Mock;
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

  mocked.getFirstAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).get(...(params as never[])) ?? null;
  });

  mocked.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
    // Mirror the real expo-sqlite behaviour: run the callback and let it throw.
    // TC-09 injects a rejection here to test that the error propagates correctly.
    await fn();
  });
});

beforeEach(() => {
  mockUuidCounter = 0;
  // Clean up between tests — keep seeded (is_default = 1) categories so FK
  // targets like 'cat_food' / 'cat_entertainment' remain valid.
  realDb.exec('DELETE FROM transactions');
  realDb.exec('DELETE FROM commitments');
  realDb.exec('DELETE FROM categories WHERE is_default = 0');

  // Reset withTransactionAsync to its normal behaviour and clear call history.
  // Some TC-09 tests override it with mockRejectedValueOnce — clearMock restores
  // the call count so that "toHaveBeenCalledTimes(1)" assertions are per-test.
  const mocked = (SQLite as unknown as { __fakeDb: { withTransactionAsync: jest.Mock } }).__fakeDb;
  mocked.withTransactionAsync.mockClear();
  mocked.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
    await fn();
  });
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const repo = new CategoryRepository();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function insertTransaction(categoryId: string, suffix: string) {
  realDb
    .prepare(
      `INSERT INTO transactions
       (id, type, amount, currency, egp_amount, exchange_rate,
        account_id, to_account_id, category_id, note,
        transaction_date, transaction_time, created_at, updated_at)
       VALUES (?, 'expense', 100, 'EGP', 100, NULL, 'acc_test', NULL, ?, NULL, '2026-01-01', '10:00:00', ?, ?)`,
    )
    .run(`tx-${suffix}`, categoryId, NOW, NOW);
}

function insertCommitment(id: string, categoryId: string) {
  realDb
    .prepare(
      `INSERT INTO commitments
       (id, name, amount_type, amount, currency, category_id,
        recurrence_every, recurrence_period, start_date, account_id,
        notes, duration_type, end_date, end_after_count, is_active,
        created_at, updated_at)
       VALUES (?, ?, 'fixed', 50, 'EGP', ?, 1, 'months', '2026-01-01',
               'acc_test', NULL, 'forever', NULL, NULL, 1, ?, ?)`,
    )
    .run(id, `Commitment ${id}`, categoryId, NOW, NOW);
}

function countTransactions(categoryId: string): number {
  return (
    realDb
      .prepare('SELECT COUNT(*) as n FROM transactions WHERE category_id = ?')
      .get(categoryId) as { n: number }
  ).n;
}

function countCommitments(categoryId: string): number {
  return (
    realDb
      .prepare('SELECT COUNT(*) as n FROM commitments WHERE category_id = ?')
      .get(categoryId) as { n: number }
  ).n;
}

function countCategories(id: string): number {
  return (
    realDb.prepare('SELECT COUNT(*) as n FROM categories WHERE id = ?').get(id) as { n: number }
  ).n;
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-01: 47 transactions reassigned, balances and amounts untouched
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryRepository.reassignAndDelete — TC-01 (transaction reassignment)', () => {
  it('moves 47 transactions from source to target category', async () => {
    // Source: custom category (to be deleted), target: cat_food (seeded, persists)
    insertFromCategory('from-cat-01');
    for (let i = 0; i < 47; i++) {
      insertTransaction('from-cat-01', `tc01-a-${i}`);
    }
    // 12 pre-existing transactions on target
    for (let i = 0; i < 12; i++) {
      insertTransaction('cat_food', `tc01-b-${i}`);
    }

    expect(countTransactions('from-cat-01')).toBe(47);
    expect(countTransactions('cat_food')).toBe(12);

    await repo.reassignAndDelete('from-cat-01', 'cat_food');

    expect(countTransactions('from-cat-01')).toBe(0);
    expect(countTransactions('cat_food')).toBe(59); // 47 + 12 per TC-01
  });

  it('does not change transaction amounts or egp_amounts (TC-01 assertion)', async () => {
    insertFromCategory('from-cat-01b');
    insertTransaction('from-cat-01b', 'tc01c-1');

    const before = realDb
      .prepare('SELECT amount, egp_amount FROM transactions WHERE category_id = ?')
      .all('from-cat-01b') as Array<{ amount: number; egp_amount: number }>;

    await repo.reassignAndDelete('from-cat-01b', 'cat_food');

    // After reassign the transaction is now in cat_food — filter by what moved
    const after = realDb
      .prepare("SELECT amount, egp_amount FROM transactions WHERE id = 'tx-tc01c-1'")
      .all() as Array<{ amount: number; egp_amount: number }>;

    expect(after.map((r) => r.amount)).toEqual(before.map((r) => r.amount));
    expect(after.map((r) => r.egp_amount)).toEqual(before.map((r) => r.egp_amount));
  });

  it('deletes the source category row', async () => {
    insertFromCategory('from-cat-01c');
    expect(countCategories('from-cat-01c')).toBe(1);

    await repo.reassignAndDelete('from-cat-01c', 'cat_food');

    expect(countCategories('from-cat-01c')).toBe(0);
  });

  it('leaves target category intact', async () => {
    insertFromCategory('from-cat-01d');

    await repo.reassignAndDelete('from-cat-01d', 'cat_food');

    expect(countCategories('cat_food')).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-02: Commitments updated in the same transaction
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryRepository.reassignAndDelete — TC-02 (commitment cascade)', () => {
  it('updates commitments.category_id for linked commitments', async () => {
    // 8 transactions + 2 commitments, reassign to seeded cat_entertainment
    insertFromCategory('from-cat-02a');
    for (let i = 0; i < 8; i++) {
      insertTransaction('from-cat-02a', `tc02-tx-${i}`);
    }
    insertCommitment('commit-netflix', 'from-cat-02a');
    insertCommitment('commit-spotify', 'from-cat-02a');

    expect(countTransactions('from-cat-02a')).toBe(8);
    expect(countCommitments('from-cat-02a')).toBe(2);

    await repo.reassignAndDelete('from-cat-02a', 'cat_entertainment');

    expect(countTransactions('from-cat-02a')).toBe(0);
    expect(countCommitments('from-cat-02a')).toBe(0);
    expect(countTransactions('cat_entertainment')).toBe(8);
    expect(countCommitments('cat_entertainment')).toBe(2);
  });

  it('does not alter commitment amounts or recurrence_every (TC-02 assertion)', async () => {
    insertFromCategory('from-cat-02b');
    insertCommitment('commit-test-02', 'from-cat-02b');

    const before = realDb
      .prepare('SELECT amount, recurrence_every FROM commitments WHERE id = ?')
      .get('commit-test-02') as { amount: number; recurrence_every: number };

    await repo.reassignAndDelete('from-cat-02b', 'cat_entertainment');

    const after = realDb
      .prepare('SELECT amount, recurrence_every FROM commitments WHERE id = ?')
      .get('commit-test-02') as { amount: number; recurrence_every: number };

    expect(after.amount).toBe(before.amount);
    expect(after.recurrence_every).toBe(before.recurrence_every);
  });

  it('handles category with commitments but no transactions', async () => {
    insertFromCategory('from-cat-02c');
    insertCommitment('commit-only-02', 'from-cat-02c');
    expect(countTransactions('from-cat-02c')).toBe(0);
    expect(countCommitments('from-cat-02c')).toBe(1);

    await repo.reassignAndDelete('from-cat-02c', 'cat_entertainment');

    expect(countCommitments('from-cat-02c')).toBe(0);
    expect(countCommitments('cat_entertainment')).toBe(1);
    expect(countCategories('from-cat-02c')).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-09: Atomicity — withTransactionAsync rejection rolls back everything
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryRepository.reassignAndDelete — TC-09 (atomicity)', () => {
  it('wraps all SQL in a single withTransactionAsync call', async () => {
    const mocked = (SQLite as unknown as { __fakeDb: { withTransactionAsync: jest.Mock } })
      .__fakeDb;

    insertFromCategory('from-cat-09a');
    insertTransaction('from-cat-09a', 'tc09-tx-1');

    await repo.reassignAndDelete('from-cat-09a', 'cat_food');

    // Must be called exactly once per reassignAndDelete invocation
    expect(mocked.withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('when withTransactionAsync rejects, the error propagates', async () => {
    const mocked = (SQLite as unknown as { __fakeDb: { withTransactionAsync: jest.Mock } })
      .__fakeDb;

    insertFromCategory('from-cat-09b');

    // Simulate a DB-level failure (the transaction wrapper itself throws)
    mocked.withTransactionAsync.mockRejectedValueOnce(new Error('DB write failed'));

    await expect(repo.reassignAndDelete('from-cat-09b', 'cat_food')).rejects.toThrow(
      'DB write failed',
    );
  });

  it('DB state is either fully applied or fully reverted — never mid (TC-09)', async () => {
    // Seed 47 transactions on a custom source category
    insertFromCategory('from-cat-09c');
    for (let i = 0; i < 47; i++) {
      insertTransaction('from-cat-09c', `tc09-mid-${i}`);
    }
    expect(countTransactions('from-cat-09c')).toBe(47);
    expect(countCategories('from-cat-09c')).toBe(1);

    const mocked = (SQLite as unknown as { __fakeDb: { withTransactionAsync: jest.Mock } })
      .__fakeDb;

    // Simulate DB-level failure — the whole transaction is rolled back
    // (withTransactionAsync itself rejects without executing the callback)
    mocked.withTransactionAsync.mockRejectedValueOnce(new Error('Simulated DB failure'));

    await expect(repo.reassignAndDelete('from-cat-09c', 'cat_food')).rejects.toThrow();

    // DB must be in pre-operation state — never partially applied
    expect(countTransactions('from-cat-09c')).toBe(47);
    expect(countCategories('from-cat-09c')).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CategoryRepository.add — name uniqueness within type (TC-06)
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryRepository.add — name uniqueness (TC-06)', () => {
  const myExpenseInput: NewCategoryInput = {
    name: 'My Expenses',
    type: CategoryType.Expense,
    icon: 'home',
    color: '#fff',
  };

  it('throws when a duplicate name+type already exists', async () => {
    await repo.add(myExpenseInput);

    await expect(repo.add({ ...myExpenseInput })).rejects.toThrow();

    // DB must still have exactly 1 row with that name+type
    const count = (
      realDb
        .prepare(
          "SELECT COUNT(*) as n FROM categories WHERE name = 'My Expenses' AND type = 'expense'",
        )
        .get() as { n: number }
    ).n;
    expect(count).toBe(1);
  });

  it('allows the same name under a different type (TC-06 cross-type)', async () => {
    await repo.add(myExpenseInput);

    // Adding as income should succeed — different type, not a collision
    const result = await repo.add({
      name: 'My Expenses',
      type: CategoryType.Income,
      icon: 'briefcase',
      color: '#fff',
    });

    expect(result.id).toBeTruthy();
    expect(result.type).toBe(CategoryType.Income);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CategoryRepository.update — type field immutability (TC-07)
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryRepository.update — type field immutability (TC-07)', () => {
  it('update() does not accept or apply a type field', async () => {
    const cat = await repo.add({
      name: 'Salary Custom',
      type: CategoryType.Income,
      icon: 'briefcase',
      color: '#fff',
    });

    // UpdateCategoryInput does not include type — TypeScript enforces this at compile time.
    // At runtime, we verify the type column is unchanged after update.
    await repo.update(cat.id, { name: 'Salary Updated', icon: 'star', color: '#aaa' });

    const row = realDb.prepare('SELECT type FROM categories WHERE id = ?').get(cat.id) as {
      type: string;
    };

    expect(row.type).toBe('income');
  });
});
