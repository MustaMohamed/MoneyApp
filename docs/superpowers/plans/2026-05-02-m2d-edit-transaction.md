# M2d — Edit Transaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to edit an existing transaction from the U7 Detail screen — amount, category, note, date/time, and exchange rate are editable; type and accounts are locked.

**Architecture:** Bottom-up TDD. Start with pure helper functions + database layer, mirror up through repository and store, then refactor the Add Transaction folder to `transaction_form/` with isolated add/edit hooks sharing a presentational form body, and finally wire the Edit button on the detail screen. The `updateTransaction` DB function delta-applies balance changes atomically within a single `withTransactionAsync` block.

**Tech Stack:** expo-sqlite, Zustand v5, React Hook Form v7 + Zod v4, react-native-reanimated, MaterialCommunityIcons, TypeScript strict, Jest + better-sqlite3

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `app/(app)/(tabs)/transactions/transaction_form/edit_transaction.hook.ts` | `useEditTransaction(initialTx, onClose)` — pre-filled form, locked type/accounts, calls `store.updateTransaction` |
| `app/(app)/(tabs)/transactions/transaction_form/edit_transaction.store.ts` | Zustand store for edit-mode sheet UI state |
| `app/(app)/(tabs)/transactions/transaction_form/transaction_form_body.tsx` | Shared presentational form body used by both sheets |
| `app/(app)/(tabs)/transactions/transaction_form/transaction_form.anim.ts` | Renamed from `add_transaction.anim.ts` |
| `__tests__/update_transaction.query_executor.test.ts` | DB-layer tests for `updateTransaction` |

### Renamed / moved files
| From | To |
|---|---|
| `app/(app)/(tabs)/transactions/add_transaction/` | `app/(app)/(tabs)/transactions/transaction_form/` |
| `add_transaction.anim.ts` | `transaction_form.anim.ts` |

### Modified files
| File | Change |
|---|---|
| `database/transactions.ts` | Add `UpdateTransactionInput` interface + `updateTransaction()` function |
| `repositories/transaction.repository.ts` | Add `update()` to interface + class |
| `store/transaction.store.ts` | Add `updateTransaction` action |
| `constants/strings.ts` | Add `editTxTitle` |
| `app/(app)/(tabs)/transactions/transaction_form/index.tsx` | Add `EditTransactionSheet` export; both sheets call `useTransactionFormAnim` |
| `app/(app)/(tabs)/transactions/transaction_form/add_transaction.hook.ts` | Update import path for anim |
| `app/(app)/(tabs)/transactions/transaction_form/components/type_tabs.tsx` | Add `disabled?: boolean` prop |
| `app/(app)/(tabs)/transactions/index.tsx` | Update import `./add_transaction` → `./transaction_form` |
| `app/(app)/(tabs)/transactions/detail/[id]/index.tsx` | Wire Edit button, mount `EditTransactionSheet` |
| `app/(app)/(tabs)/transactions/detail/detail.hook.ts` | Add `reload()` function |
| `app/(app)/(tabs)/transactions/detail/components/action_row.tsx` | Make Edit button a real `Pressable` with `onEdit` prop |

---

## Task 1: Add `editTxTitle` string

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1: Add the string**

Open `constants/strings.ts`. After the `editComingSoon` line (currently line ~276), add:

```typescript
  editTxTitle: 'Edit Transaction',
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add constants/strings.ts
git commit -m "feat(m2d): add editTxTitle string"
```

---

## Task 2: `updateTransaction` — database layer (TDD)

**Files:**
- Modify: `database/transactions.ts`
- Create: `__tests__/update_transaction.query_executor.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/update_transaction.query_executor.test.ts`:

```typescript
import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { Currency, TransactionType } from '@/constants/enums';
import { addTransaction, updateTransaction } from '@/database/transactions';
import type { Transaction } from '@/database/entities/transaction.entity';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';
const DATE = '2026-05-01';
const TIME = '12:00:00';

function seedAccounts() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        revolving_balance,minimum_payment,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES
         ('acc_asset','Checking','bank','EGP',1000,1000,NULL,NULL,0,0,0,?,?),
         ('acc_cc','Credit Card','credit_card','EGP',0,500,300,200,0,0,1,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seedAccounts();

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getAllAsync: jest.Mock;
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

  mocked.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
    await fn();
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
  realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc_asset'").run();
  realDb
    .prepare(
      "UPDATE accounts SET current_balance = 500, revolving_balance = 300, minimum_payment = 200 WHERE id = 'acc_cc'",
    )
    .run();
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof updateTransaction
>[0];

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    account_id: 'acc_asset',
    to_account_id: null,
    category_id: 'cat_food',
    note: null,
    transaction_date: DATE,
    transaction_time: TIME,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

async function seedTx(overrides: Partial<Transaction> = {}) {
  const tx = makeTx(overrides);
  await addTransaction(mockDb, tx);
  return tx;
}

describe('updateTransaction — no-op for unknown id', () => {
  it('resolves without error when id does not exist', async () => {
    await expect(
      updateTransaction(mockDb, 'ghost', {
        amount: 50,
        currency: Currency.EGP,
        egp_amount: 50,
        exchange_rate: null,
        category_id: null,
        note: null,
        transaction_date: DATE,
        transaction_time: TIME,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('updateTransaction — expense', () => {
  it('updates the transaction row fields', async () => {
    await seedTx({ egp_amount: 100 });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 200,
      currency: Currency.EGP,
      egp_amount: 200,
      exchange_rate: null,
      category_id: 'cat_groceries',
      note: 'updated note',
      transaction_date: '2026-06-01',
      transaction_time: '09:00:00',
    });
    const row = realDb
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get('tx-1') as Transaction;
    expect(row.amount).toBe(200);
    expect(row.egp_amount).toBe(200);
    expect(row.category_id).toBe('cat_groceries');
    expect(row.note).toBe('updated note');
    expect(row.transaction_date).toBe('2026-06-01');
    expect(row.transaction_time).toBe('09:00:00');
  });

  it('delta-applies balance: increase expense debits more', async () => {
    // Add 100 → balance 900. Update to 150 → delta = +50 → balance = 900 - 50 = 850
    await seedTx({ egp_amount: 100 });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 150,
      currency: Currency.EGP,
      egp_amount: 150,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(850);
  });

  it('delta-applies balance: decrease expense credits back', async () => {
    // Add 100 → balance 900. Update to 60 → delta = -40 → balance = 900 + 40 = 940
    await seedTx({ egp_amount: 100 });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 60,
      currency: Currency.EGP,
      egp_amount: 60,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(940);
  });

  it('zero delta leaves balance unchanged', async () => {
    await seedTx({ egp_amount: 100 });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(900);
  });
});

describe('updateTransaction — income', () => {
  it('delta-applies balance: increase income credits more', async () => {
    // Add income 200 → balance 1200. Update to 300 → delta = +100 → balance = 1200 + 100 = 1300
    await seedTx({ egp_amount: 200, type: TransactionType.Income });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 300,
      currency: Currency.EGP,
      egp_amount: 300,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(1300);
  });

  it('delta-applies balance: decrease income debits back', async () => {
    // Add income 200 → balance 1200. Update to 100 → delta = -100 → balance = 1200 - 100 = 1100
    await seedTx({ egp_amount: 200, type: TransactionType.Income });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(1100);
  });
});

describe('updateTransaction — transfer', () => {
  it('delta-applies both accounts', async () => {
    // Add transfer 300: asset 700, cc 800. Update to 400: delta=+100 → asset 600, cc 900
    await seedTx({
      egp_amount: 300,
      type: TransactionType.Transfer,
      category_id: null,
      to_account_id: 'acc_cc',
    });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 400,
      currency: Currency.EGP,
      egp_amount: 400,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { current_balance: number };
    expect(asset.current_balance).toBe(600);
    expect(cc.current_balance).toBe(900);
  });
});

describe('updateTransaction — cc_payment', () => {
  it('re-applies installment split after amount increase', async () => {
    // Initial: acc_asset=1000, acc_cc current=500, revolving=300, min_payment=200
    // Add cc_payment 350: asset=650, cc current=150, revolving=150
    // Update to 450: reverse 350 → asset=1000, cc current=500, revolving=300
    //                apply 450: inst_covered=200, revolving_reduction=250 → revolving=50
    //                           asset=550, cc current=50
    await seedTx({
      egp_amount: 350,
      type: TransactionType.CCPayment,
      category_id: null,
      to_account_id: 'acc_cc',
    });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 450,
      currency: Currency.EGP,
      egp_amount: 450,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb
      .prepare("SELECT current_balance, revolving_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { current_balance: number; revolving_balance: number };
    expect(asset.current_balance).toBe(550);
    expect(cc.current_balance).toBe(50);
    expect(cc.revolving_balance).toBe(50);
  });

  it('re-applies installment split after amount decrease', async () => {
    // Add 350 → asset=650, cc current=150, revolving=150
    // Update to 100: reverse 350 → asset=1000, cc current=500, revolving=300
    //                apply 100: inst_covered=100, revolving_reduction=0 → revolving stays 300
    //                           asset=900, cc current=400
    await seedTx({
      egp_amount: 350,
      type: TransactionType.CCPayment,
      category_id: null,
      to_account_id: 'acc_cc',
    });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb
      .prepare("SELECT current_balance, revolving_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { current_balance: number; revolving_balance: number };
    expect(asset.current_balance).toBe(900);
    expect(cc.current_balance).toBe(400);
    expect(cc.revolving_balance).toBe(300);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest __tests__/update_transaction.query_executor.test.ts --no-coverage
```

Expected: FAIL — `updateTransaction` is not exported from `@/database/transactions`.

- [ ] **Step 3: Implement `updateTransaction` in `database/transactions.ts`**

Add after the `deleteTransaction` function (end of file):

```typescript
export interface UpdateTransactionInput {
  amount: number;
  currency: Currency;
  egp_amount: number;
  exchange_rate?: number | null;
  category_id?: string | null;
  note?: string | null;
  transaction_date: string;
  transaction_time: string;
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: string,
  updates: UpdateTransactionInput,
): Promise<void> {
  const rows = await db.getAllAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  const existing = rows[0];
  if (!existing) return;

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (existing.type === 'expense') {
      const delta = updates.egp_amount - existing.egp_amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.account_id],
      );
    } else if (existing.type === 'income') {
      const delta = updates.egp_amount - existing.egp_amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.account_id],
      );
    } else if (existing.type === 'transfer') {
      const delta = updates.egp_amount - existing.egp_amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.account_id],
      );
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.to_account_id],
      );
    } else if (existing.type === 'cc_payment') {
      // For CC payment, simple delta math is incorrect because the installment-first
      // split means the old amount affected revolving_balance non-linearly.
      // Strategy: reverse the old payment (same logic as deleteTransaction for cc_payment),
      // then apply the new payment (same logic as addTransaction for cc_payment).

      // --- Reverse old payment ---
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [existing.egp_amount, now, existing.account_id],
      );
      const [ccForReverse] = await db.getAllAsync<{
        minimum_payment: number | null;
        revolving_balance: number | null;
      }>('SELECT minimum_payment, revolving_balance FROM accounts WHERE id = ?', [
        existing.to_account_id,
      ]);
      const oldInstallmentDue = ccForReverse?.minimum_payment ?? 0;
      const oldInstallmentCovered = Math.min(existing.egp_amount, oldInstallmentDue);
      const oldRevolvingRestore = Math.max(0, existing.egp_amount - oldInstallmentCovered);
      await db.runAsync(
        `UPDATE accounts
           SET current_balance   = current_balance + ?,
               revolving_balance = revolving_balance + ?,
               updated_at        = ?
         WHERE id = ?`,
        [existing.egp_amount, oldRevolvingRestore, now, existing.to_account_id],
      );

      // --- Apply new payment ---
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [updates.egp_amount, now, existing.account_id],
      );
      const [ccForApply] = await db.getAllAsync<{
        revolving_balance: number | null;
        minimum_payment: number | null;
      }>('SELECT revolving_balance, minimum_payment FROM accounts WHERE id = ?', [
        existing.to_account_id,
      ]);
      const newRevolving = ccForApply?.revolving_balance ?? 0;
      const newInstallmentDue = ccForApply?.minimum_payment ?? 0;
      const newInstallmentCovered = Math.min(updates.egp_amount, newInstallmentDue);
      const newRevolvingReduction = Math.max(0, updates.egp_amount - newInstallmentCovered);
      const finalRevolving = Math.max(0, newRevolving - newRevolvingReduction);
      await db.runAsync(
        `UPDATE accounts
           SET current_balance   = current_balance - ?,
               revolving_balance = ?,
               updated_at        = ?
         WHERE id = ?`,
        [updates.egp_amount, finalRevolving, now, existing.to_account_id],
      );
    }

    await db.runAsync(
      `UPDATE transactions
         SET amount = ?, currency = ?, egp_amount = ?, exchange_rate = ?,
             category_id = ?, note = ?, transaction_date = ?, transaction_time = ?,
             updated_at = ?
       WHERE id = ?`,
      [
        updates.amount,
        updates.currency,
        updates.egp_amount,
        updates.exchange_rate ?? null,
        updates.category_id ?? null,
        updates.note ?? null,
        updates.transaction_date,
        updates.transaction_time,
        now,
        id,
      ],
    );
  });
}
```

Also add `Currency` to the existing import at the top of `database/transactions.ts` if not already present:

```typescript
import type { Currency, TransactionType } from '@/constants/enums';
```

(Change `type { TransactionType }` → `type { Currency, TransactionType }`)

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest __tests__/update_transaction.query_executor.test.ts --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add database/transactions.ts __tests__/update_transaction.query_executor.test.ts
git commit -m "feat(m2d): updateTransaction — delta balance update for all tx types"
```

---

## Task 3: Repository + Store layers

**Files:**
- Modify: `repositories/transaction.repository.ts`
- Modify: `store/transaction.store.ts`

- [ ] **Step 1: Add `update` to the repository interface and class**

In `repositories/transaction.repository.ts`:

1. Add `updateTransaction` to the import from `@/database/transactions`:
```typescript
import {
  addTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  getTransactionsByAccount,
  updateTransaction,
  type UpdateTransactionInput,
} from '@/database/transactions';
```

2. Add `UpdateTransactionInput` to the re-export:
```typescript
export type { TransactionListQuery, UpdateTransactionInput };
```

3. Add to the `ITransactionRepository` interface:
```typescript
update(id: string, data: UpdateTransactionInput): Promise<void>;
```

4. Add the implementation to `TransactionRepository`:
```typescript
async update(id: string, data: UpdateTransactionInput): Promise<void> {
  const db = await getDb();
  await updateTransaction(db, id, data);
}
```

- [ ] **Step 2: Add `updateTransaction` action to the store**

In `store/transaction.store.ts`:

1. Add `UpdateTransactionInput` to the import from the repository:
```typescript
import {
  TransactionRepository,
  type ITransactionRepository,
  type NewTransactionInput,
  type TransactionListQuery,
  type UpdateTransactionInput,
} from '@/repositories/transaction.repository';
```

2. Add `UpdateTransactionInput` to the re-export line:
```typescript
export type { Transaction, NewTransactionInput, TransactionListQuery, UpdateTransactionInput };
```

3. Add `updateTransaction` to the `TransactionState` interface:
```typescript
updateTransaction: (id: string, data: UpdateTransactionInput) => Promise<void>;
```

4. Add the implementation inside the `return { ... }` block of `createTransactionStore`, after `deleteTransaction`:
```typescript
updateTransaction: async (id, data) => {
  await repo.update(id, data);
  await get()
    .refresh()
    .catch((err) => console.error('[transactionStore] post-update refresh failed:', err));
},
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add repositories/transaction.repository.ts store/transaction.store.ts
git commit -m "feat(m2d): wire updateTransaction through repository and store"
```

---

## Task 4: Rename `add_transaction/` → `transaction_form/`

**Files:**
- Rename directory: `app/(app)/(tabs)/transactions/add_transaction/` → `app/(app)/(tabs)/transactions/transaction_form/`
- Rename: `add_transaction.anim.ts` → `transaction_form.anim.ts` (inside the new folder)
- Update import in: `add_transaction.hook.ts` (one line — the anim import)
- Update import in: `index.tsx` (the anim import)

- [ ] **Step 1: Rename the folder and the anim file**

```bash
mv "app/(app)/(tabs)/transactions/add_transaction" "app/(app)/(tabs)/transactions/transaction_form"
mv "app/(app)/(tabs)/transactions/transaction_form/add_transaction.anim.ts" \
   "app/(app)/(tabs)/transactions/transaction_form/transaction_form.anim.ts"
```

- [ ] **Step 2: Update the anim import in `transaction_form/add_transaction.hook.ts`**

The file currently has no direct import of the anim file — the anim is imported in `index.tsx`. Verify:

```bash
grep -n "anim" "app/(app)/(tabs)/transactions/transaction_form/add_transaction.hook.ts"
```

Expected: no matches (hook doesn't import anim). Proceed to step 3.

- [ ] **Step 3: Update the anim import in `transaction_form/index.tsx`**

Find the line:
```typescript
import { useAddTransactionAnim } from './add_transaction.anim';
```

Replace with:
```typescript
import { useAddTransactionAnim } from './transaction_form.anim';
```

Also rename the function reference: the anim file still exports `useAddTransactionAnim` — do NOT rename the function yet (that would cascade). Leave it as-is.

- [ ] **Step 4: Update the consumer import in `transactions/index.tsx`**

Find the line:
```typescript
import { AddTransactionSheet } from './add_transaction';
import { useAddTransactionStore } from './add_transaction/add_transaction.store';
```

Replace with:
```typescript
import { AddTransactionSheet } from './transaction_form';
import { useAddTransactionStore } from './transaction_form/add_transaction.store';
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(m2d): rename add_transaction/ to transaction_form/"
```

---

## Task 5: Extend `TypeTabs` with `disabled` prop

**Files:**
- Modify: `app/(app)/(tabs)/transactions/transaction_form/components/type_tabs.tsx`

- [ ] **Step 1: Update the `Props` interface and component**

Replace the entire file contents with:

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';

const TABS: { type: TransactionType; label: string; color: string }[] = [
  { type: TransactionType.Expense, label: Strings.addTxTypeExpense, color: Colors.dark.negative },
  { type: TransactionType.Income, label: Strings.addTxTypeIncome, color: Colors.dark.positive },
  { type: TransactionType.Transfer, label: Strings.addTxTypeTransfer, color: '#4A9EE0' },
  { type: TransactionType.CCPayment, label: Strings.addTxTypeCCPayment, color: '#9B73D4' },
];

interface Props {
  active: TransactionType;
  onSelect: (type: TransactionType) => void;
  disabled?: boolean;
}

export function TypeTabs({ active, onSelect, disabled }: Props) {
  return (
    <View style={styles.row}>
      {TABS.map(({ type, label, color }) => {
        const isActive = type === active;
        return (
          <Pressable
            key={type}
            style={[
              styles.tab,
              isActive && { borderBottomColor: color, borderBottomWidth: 2 },
              disabled && !isActive && styles.tabDisabled,
            ]}
            onPress={() => !disabled && onSelect(type)}
            hitSlop={4}
          >
            <Text style={[styles.label, isActive && { color }, disabled && !isActive && styles.labelDisabled]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabDisabled: {
    opacity: 0.3,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  labelDisabled: {
    color: Colors.dark.text2,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(tabs)/transactions/transaction_form/components/type_tabs.tsx"
git commit -m "feat(m2d): TypeTabs disabled prop for edit mode"
```

---

## Task 6: `useEditTransactionStore`

**Files:**
- Create: `app/(app)/(tabs)/transactions/transaction_form/edit_transaction.store.ts`

- [ ] **Step 1: Create the store**

```typescript
import { create } from 'zustand';

import type { Transaction } from '@/database/entities/transaction.entity';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface EditTransactionState {
  visible: boolean;
  editingTx: Transaction | null;
  amountStr: string;
  saving: boolean;
  showAccountPicker: boolean;
  showToPicker: boolean;
  showCategoryPicker: boolean;
  open: (tx: Transaction) => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  handleNumpad: (action: NumpadAction, value?: string) => void;
  setShowAccountPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  editingTx: null as Transaction | null,
  amountStr: '0',
  saving: false,
  showAccountPicker: false,
  showToPicker: false,
  showCategoryPicker: false,
};

export const useEditTransactionStore = create<EditTransactionState>((set) => ({
  visible: false,
  ...INITIAL_STATE,

  open: (tx: Transaction) =>
    set({
      visible: true,
      editingTx: tx,
      // Format amount: remove trailing ".0" for integers so numpad starts clean
      amountStr: tx.amount % 1 === 0 ? String(Math.floor(tx.amount)) : String(tx.amount),
    }),

  close: () => set({ visible: false, ...INITIAL_STATE }),

  setSaving: (saving) => set({ saving }),

  handleNumpad: (action, value) =>
    set((s) => {
      const prev = s.amountStr;
      if (action === 'backspace') return { amountStr: prev.length <= 1 ? '0' : prev.slice(0, -1) };
      if (action === 'decimal') return { amountStr: prev.includes('.') ? prev : prev + '.' };
      const digit = value ?? '';
      if (prev === '0') return { amountStr: digit === '0' ? '0' : digit };
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 2) return {};
      }
      return { amountStr: prev + digit };
    }),

  setShowAccountPicker: (v) => set({ showAccountPicker: v }),
  setShowToPicker: (v) => set({ showToPicker: v }),
  setShowCategoryPicker: (v) => set({ showCategoryPicker: v }),

  reset: () => set({ ...INITIAL_STATE }),
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(tabs)/transactions/transaction_form/edit_transaction.store.ts"
git commit -m "feat(m2d): useEditTransactionStore"
```

---

## Task 7: `useEditTransaction` hook

**Files:**
- Create: `app/(app)/(tabs)/transactions/transaction_form/edit_transaction.hook.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore, type UpdateTransactionInput } from '@/store/transaction.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { useEditTransactionStore } from './edit_transaction.store';

export type EditTransactionFormValues = {
  amount: number;
  categoryId: string;
  note: string;
  date: string;
  time: string;
  exchangeRate: string;
};

function createEditSchema(type: TransactionType) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  return z.object({
    amount: z
      .number({ error: Strings.addTxErrAmountRequired })
      .refine((v) => v > 0, Strings.addTxErrAmountZero),
    categoryId: isTransferOrCC ? z.string() : z.string().min(1, Strings.addTxErrCategoryRequired),
    note: z.string(),
    date: z.string().min(1),
    time: z.string().min(1),
    exchangeRate: z.string(),
  });
}

function buildDefaults(
  tx: Transaction,
  currentRate: number,
): EditTransactionFormValues {
  return {
    amount: tx.amount,
    categoryId: tx.category_id ?? '',
    note: tx.note ?? '',
    date: tx.transaction_date,
    time: tx.transaction_time,
    exchangeRate: String(tx.exchange_rate ?? currentRate),
  };
}

export function useEditTransaction(initialTx: Transaction, onClose: () => void) {
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const currentRate = useCurrencyStore((s) => s.rate);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);

  const {
    amountStr,
    visible,
    saving,
    setSaving,
    showCategoryPicker,
    setShowCategoryPicker,
    handleNumpad,
  } = useEditTransactionStore();

  const type = initialTx.type;
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  const schema = useMemo(() => createEditSchema(type), [type]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaults(initialTx, currentRate),
  });

  const categoryId = form.watch('categoryId');
  const note = form.watch('note');
  const exchangeRate = form.watch('exchangeRate');

  // Locked account (cannot be changed during edit)
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === initialTx.account_id) ?? null,
    [accounts, initialTx.account_id],
  );
  const selectedToAccount = useMemo(
    () => (initialTx.to_account_id ? accounts.find((a) => a.id === initialTx.to_account_id) ?? null : null),
    [accounts, initialTx.to_account_id],
  );

  const isUSD = selectedAccount?.currency === Currency.USD;

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const visibleCategories = useMemo(
    () =>
      categories.filter((c) => c.type === (type === TransactionType.Income ? 'income' : 'expense')),
    [categories, type],
  );

  const errors = {
    amount: form.formState.errors.amount?.message,
    category: form.formState.errors.categoryId?.message,
    rate: form.formState.errors.exchangeRate?.message,
  };

  // Sync numpad display string → RHF amount field
  useEffect(() => {
    const parsed = parseFloat(amountStr);
    form.setValue('amount', isNaN(parsed) ? 0 : parsed);
  }, [amountStr]);

  // When the sheet closes, reset the form to the original tx values
  useEffect(() => {
    if (!visible) {
      form.reset(buildDefaults(initialTx, currentRate));
    }
  }, [visible]);

  async function onValid(data: EditTransactionFormValues) {
    setSaving(true);
    try {
      const rate = isUSD && data.exchangeRate ? parseFloat(data.exchangeRate) : undefined;
      const egp_amount = isUSD && rate ? data.amount * rate : data.amount;

      const updateInput: UpdateTransactionInput = {
        amount: data.amount,
        currency: selectedAccount?.currency ?? Currency.EGP,
        egp_amount,
        exchange_rate: rate ?? null,
        category_id: !isTransferOrCC ? data.categoryId : null,
        note: data.note.trim() || null,
        transaction_date: data.date,
        transaction_time: data.time,
      };

      await updateTransaction(initialTx.id, updateInput);
      await loadAccounts();
      onClose();
    } catch {
      // error logged by store
    } finally {
      setSaving(false);
    }
  }

  function selectCategory(category: Category) {
    form.setValue('categoryId', category.id);
    setShowCategoryPicker(false);
  }

  return {
    form,
    type,
    amountStr,
    handleNumpad,
    selectedAccount,
    selectedToAccount,
    categoryId,
    selectedCategory,
    note,
    setNote: (v: string) => form.setValue('note', v),
    exchangeRate,
    setExchangeRate: (v: string) => form.setValue('exchangeRate', v),
    isUSD,
    isTransferOrCC,
    errors,
    saving,
    visibleCategories,
    showCategoryPicker,
    setShowCategoryPicker,
    selectCategory,
    handleSave: form.handleSubmit(onValid),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(tabs)/transactions/transaction_form/edit_transaction.hook.ts"
git commit -m "feat(m2d): useEditTransaction hook"
```

---

## Task 8: `TransactionFormBody` — shared presentational component

**Files:**
- Create: `app/(app)/(tabs)/transactions/transaction_form/transaction_form_body.tsx`

This component is the inner form body — everything inside the sheet except the Reanimated wrapper. Both `AddTransactionSheet` and `EditTransactionSheet` will render it.

- [ ] **Step 1: Extract the form body from `index.tsx` into `transaction_form_body.tsx`**

Study the current `index.tsx` to understand what the body renders. Then create `transaction_form_body.tsx`:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { AccountPickerSheet } from './components/account_picker_sheet';
import { CategoryPickerSheet } from './components/category_picker_sheet';
import { ExchangeRateRow } from './components/exchange_rate_row';
import { Numpad } from './components/numpad';
import { TypeTabs } from './components/type_tabs';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';

function formatAmount(str: string): string {
  const [integer, decimal] = str.split('.');
  const formatted = new Intl.NumberFormat('en-US', { style: 'decimal' }).format(
    parseInt(integer || '0', 10),
  );
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

interface TransactionFormBodyProps {
  // Mode
  title: string;
  locked: boolean; // true = edit mode: type tabs disabled, account pickers non-tappable

  // Type
  type: TransactionType;
  onSelectType: (t: TransactionType) => void;

  // Amount
  amountStr: string;
  handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
  amountError?: string;

  // Account (from/single)
  selectedAccount: Account | null;
  showAccountPicker: boolean;
  setShowAccountPicker: (v: boolean) => void;
  accountsForFrom: Account[];
  accountId: string;
  accountError?: string;

  // To account (transfer/cc)
  selectedToAccount: Account | null;
  showToPicker: boolean;
  setShowToPicker: (v: boolean) => void;
  accountsForTo: Account[];
  toAccountId: string;
  toAccountError?: string;

  // Category
  selectedCategory: Category | null;
  showCategoryPicker: boolean;
  setShowCategoryPicker: (v: boolean) => void;
  visibleCategories: Category[];
  categoryId: string;
  categoryError?: string;

  // Exchange rate
  isUSD: boolean;
  exchangeRate: string;
  setExchangeRate: (v: string) => void;
  rateError?: string;

  // Note
  note: string;
  setNote: (v: string) => void;

  // Submit
  saving: boolean;
  onClose: () => void;
  handleSave: () => void;
}

export function TransactionFormBody({
  title,
  locked,
  type,
  onSelectType,
  amountStr,
  handleNumpad,
  amountError,
  selectedAccount,
  showAccountPicker,
  setShowAccountPicker,
  accountsForFrom,
  accountId,
  accountError,
  selectedToAccount,
  showToPicker,
  setShowToPicker,
  accountsForTo,
  toAccountId,
  toAccountError,
  selectedCategory,
  showCategoryPicker,
  setShowCategoryPicker,
  visibleCategories,
  categoryId,
  categoryError,
  isUSD,
  exchangeRate,
  setExchangeRate,
  rateError,
  note,
  setNote,
  saving,
  onClose,
  handleSave,
}: TransactionFormBodyProps) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  const amountColor =
    type === TransactionType.Income
      ? Colors.dark.positive
      : type === TransactionType.Transfer
        ? '#4A9EE0'
        : type === TransactionType.CCPayment
          ? '#9B73D4'
          : Colors.dark.negative;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
      {/* Handle + header */}
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={Size.iconMd} color={Colors.dark.text2} />
        </Pressable>
      </View>

      {/* Type tabs */}
      <TypeTabs active={type} onSelect={onSelectType} disabled={locked} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Amount display */}
        <View style={styles.amountRow}>
          <Text style={[styles.amountText, { color: amountColor }]}>
            {formatAmount(amountStr)}
          </Text>
        </View>
        {amountError ? <Text style={styles.err}>{amountError}</Text> : null}

        {/* Account picker (from / single) */}
        {locked ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            </Text>
            <View style={styles.fieldValue}>
              {selectedAccount && (
                <View
                  style={[styles.dot, { backgroundColor: selectedAccount.color ?? Colors.dark.border }]}
                />
              )}
              <Text style={styles.fieldValueText}>
                {selectedAccount?.name ?? (isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle)}
              </Text>
              <MaterialCommunityIcons name="lock-outline" size={ms(18)} color={Colors.dark.text2} />
            </View>
          </View>
        ) : (
          <Pressable style={styles.field} onPress={() => setShowAccountPicker(true)}>
            <Text style={styles.fieldLabel}>
              {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            </Text>
            <View style={styles.fieldValue}>
              {selectedAccount ? (
                <>
                  <View
                    style={[styles.dot, { backgroundColor: selectedAccount.color ?? Colors.dark.border }]}
                  />
                  <Text style={styles.fieldValueText}>{selectedAccount.name}</Text>
                </>
              ) : (
                <Text style={styles.fieldPlaceholder}>
                  {isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle}
                </Text>
              )}
              <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={Colors.dark.text2} />
            </View>
          </Pressable>
        )}
        {accountError ? <Text style={styles.err}>{accountError}</Text> : null}

        {/* To account (transfer/cc) */}
        {isTransferOrCC && (
          <>
            {locked ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{Strings.addTxToLabel}</Text>
                <View style={styles.fieldValue}>
                  {selectedToAccount && (
                    <View
                      style={[styles.dot, { backgroundColor: selectedToAccount.color ?? Colors.dark.border }]}
                    />
                  )}
                  <Text style={styles.fieldValueText}>
                    {selectedToAccount?.name ?? Strings.addTxPickToTitle}
                  </Text>
                  <MaterialCommunityIcons name="lock-outline" size={ms(18)} color={Colors.dark.text2} />
                </View>
              </View>
            ) : (
              <Pressable style={styles.field} onPress={() => setShowToPicker(true)}>
                <Text style={styles.fieldLabel}>{Strings.addTxToLabel}</Text>
                <View style={styles.fieldValue}>
                  {selectedToAccount ? (
                    <>
                      <View
                        style={[styles.dot, { backgroundColor: selectedToAccount.color ?? Colors.dark.border }]}
                      />
                      <Text style={styles.fieldValueText}>{selectedToAccount.name}</Text>
                    </>
                  ) : (
                    <Text style={styles.fieldPlaceholder}>{Strings.addTxPickToTitle}</Text>
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={Colors.dark.text2} />
                </View>
              </Pressable>
            )}
            {toAccountError ? <Text style={styles.err}>{toAccountError}</Text> : null}
          </>
        )}

        {/* Category (expense/income) */}
        {!isTransferOrCC && (
          <>
            <Pressable style={styles.field} onPress={() => setShowCategoryPicker(true)}>
              <Text style={styles.fieldLabel}>{Strings.addTxCategoryLabel}</Text>
              <View style={styles.fieldValue}>
                {selectedCategory ? (
                  <Text style={styles.fieldValueText}>{selectedCategory.name}</Text>
                ) : (
                  <Text style={styles.fieldPlaceholder}>{Strings.addTxPickCategoryTitle}</Text>
                )}
                <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={Colors.dark.text2} />
              </View>
            </Pressable>
            {categoryError ? <Text style={styles.err}>{categoryError}</Text> : null}
          </>
        )}

        {/* Exchange rate (USD accounts only) */}
        {isUSD && (
          <ExchangeRateRow value={exchangeRate} onChange={setExchangeRate} error={rateError} />
        )}

        {/* Note */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{Strings.addTxNoteLabel}</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={Strings.addTxNotePlaceholder}
            placeholderTextColor={Colors.dark.text2}
          />
        </View>

        {/* Numpad */}
        <Numpad onPress={handleNumpad} />

        {/* Save CTA */}
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.ctaLabel}>{Strings.addTxSaveCta}</Text>
        </Pressable>
      </ScrollView>

      {/* Account picker modal (add mode only — locked mode renders no pickers) */}
      {!locked && (
        <>
          <AccountPickerSheet
            visible={showAccountPicker}
            title={isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle}
            accounts={accountsForFrom}
            selectedId={accountId}
            onSelect={(a: Account) => {
              setShowAccountPicker(false);
              // Callers handle selection via the hook; we just close here.
              // Actual selection is wired in the parent sheet via the `onSelect` prop
              // of the picker — see AddTransactionSheet below.
            }}
            onClose={() => setShowAccountPicker(false)}
          />
          <AccountPickerSheet
            visible={showToPicker}
            title={Strings.addTxPickToTitle}
            accounts={accountsForTo}
            selectedId={toAccountId}
            excludeId={accountId}
            onSelect={(a: Account) => {
              setShowToPicker(false);
            }}
            onClose={() => setShowToPicker(false)}
          />
          <CategoryPickerSheet
            visible={showCategoryPicker}
            title={Strings.addTxPickCategoryTitle}
            categories={visibleCategories}
            selectedId={categoryId}
            onSelect={(c: Category) => {
              setShowCategoryPicker(false);
            }}
            onClose={() => setShowCategoryPicker(false)}
          />
        </>
      )}

      {/* Edit mode: only category picker is interactive */}
      {locked && (
        <CategoryPickerSheet
          visible={showCategoryPicker}
          title={Strings.addTxPickCategoryTitle}
          categories={visibleCategories}
          selectedId={categoryId}
          onSelect={(c: Category) => {
            setShowCategoryPicker(false);
          }}
          onClose={() => setShowCategoryPicker(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  handle: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  scrollContent: { gap: Spacing.sm, paddingBottom: Spacing.xxl },
  amountRow: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  amountText: {
    fontFamily: FontFamily.soraExtra,
    fontSize: ms(40),
  },
  field: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xxs,
  },
  fieldLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  fieldValueText: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  fieldPlaceholder: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  dot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
  },
  noteInput: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
  },
  err: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
    marginTop: -Spacing.xxs,
  },
  cta: {
    height: Size.ctaHeight,
    backgroundColor: Colors.shared.cairoGold,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.8 },
  ctaLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
```

> **Note on pickers in TransactionFormBody:** The picker `onSelect` callbacks in the body are no-ops — they just close the sheet. The real selection logic lives in the hook (add or edit). The parent sheet wires the picker's `onSelect` prop by passing the hook's selector function down. This avoids threading `selectAccount`, `selectToAccount`, `selectCategory` through the body props.

**Correction:** The above note means the body needs `onSelectAccount`, `onSelectToAccount`, `onSelectCategory` props to pass through to the pickers, OR the pickers are NOT rendered inside the body. The cleanest approach is: **do not render pickers inside the body**. Instead, render the pickers in each sheet component (`AddTransactionSheet`, `EditTransactionSheet`) outside the body, just as the original `index.tsx` did. The body only renders the visible form fields (the pressable rows that trigger pickers), and the pickers themselves live in the parent sheet.

Revise `TransactionFormBody` to remove all `AccountPickerSheet` and `CategoryPickerSheet` renders from the body. Remove `accountsForFrom`, `accountsForTo`, `visibleCategories`, `showAccountPicker`, `showToPicker`, `showCategoryPicker`, the `set*Picker` props, and `accountId`/`toAccountId`/`categoryId` (used only by pickers). Keep only the pressable rows that call `setShowAccountPicker(true)` etc.

The revised props interface is:

```typescript
interface TransactionFormBodyProps {
  title: string;
  locked: boolean;
  type: TransactionType;
  onSelectType: (t: TransactionType) => void;
  amountStr: string;
  handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
  amountError?: string;
  selectedAccount: Account | null;
  onOpenAccountPicker: () => void;
  accountError?: string;
  selectedToAccount: Account | null;
  onOpenToPicker: () => void;
  toAccountError?: string;
  selectedCategory: Category | null;
  onOpenCategoryPicker: () => void;
  categoryError?: string;
  isUSD: boolean;
  exchangeRate: string;
  setExchangeRate: (v: string) => void;
  rateError?: string;
  note: string;
  setNote: (v: string) => void;
  saving: boolean;
  onClose: () => void;
  handleSave: () => void;
}
```

Rewrite the full file using this trimmed interface — no picker renders inside the body. The rows simply call `onOpenAccountPicker()`, `onOpenToPicker()`, `onOpenCategoryPicker()` on press.

The final `transaction_form_body.tsx` (no pickers inside):

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { Numpad } from './components/numpad';
import { TypeTabs } from './components/type_tabs';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { ExchangeRateRow } from './components/exchange_rate_row';

function formatAmount(str: string): string {
  const [integer, decimal] = str.split('.');
  const formatted = new Intl.NumberFormat('en-US', { style: 'decimal' }).format(
    parseInt(integer || '0', 10),
  );
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

interface TransactionFormBodyProps {
  title: string;
  locked: boolean;
  type: TransactionType;
  onSelectType: (t: TransactionType) => void;
  amountStr: string;
  handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
  amountError?: string;
  selectedAccount: Account | null;
  onOpenAccountPicker: () => void;
  accountError?: string;
  selectedToAccount: Account | null;
  onOpenToPicker: () => void;
  toAccountError?: string;
  selectedCategory: Category | null;
  onOpenCategoryPicker: () => void;
  categoryError?: string;
  isUSD: boolean;
  exchangeRate: string;
  setExchangeRate: (v: string) => void;
  rateError?: string;
  note: string;
  setNote: (v: string) => void;
  saving: boolean;
  onClose: () => void;
  handleSave: () => void;
}

export function TransactionFormBody({
  title,
  locked,
  type,
  onSelectType,
  amountStr,
  handleNumpad,
  amountError,
  selectedAccount,
  onOpenAccountPicker,
  accountError,
  selectedToAccount,
  onOpenToPicker,
  toAccountError,
  selectedCategory,
  onOpenCategoryPicker,
  categoryError,
  isUSD,
  exchangeRate,
  setExchangeRate,
  rateError,
  note,
  setNote,
  saving,
  onClose,
  handleSave,
}: TransactionFormBodyProps) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  const amountColor =
    type === TransactionType.Income
      ? Colors.dark.positive
      : type === TransactionType.Transfer
        ? '#4A9EE0'
        : type === TransactionType.CCPayment
          ? '#9B73D4'
          : Colors.dark.negative;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={Size.iconMd} color={Colors.dark.text2} />
        </Pressable>
      </View>

      <TypeTabs active={type} onSelect={onSelectType} disabled={locked} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.amountRow}>
          <Text style={[styles.amountText, { color: amountColor }]}>
            {formatAmount(amountStr)}
          </Text>
        </View>
        {amountError ? <Text style={styles.err}>{amountError}</Text> : null}

        {/* Account (from/single) */}
        {locked ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            </Text>
            <View style={styles.fieldValue}>
              {selectedAccount && (
                <View style={[styles.dot, { backgroundColor: selectedAccount.color ?? Colors.dark.border }]} />
              )}
              <Text style={styles.fieldValueText}>
                {selectedAccount?.name ?? (isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle)}
              </Text>
              <MaterialCommunityIcons name="lock-outline" size={ms(18)} color={Colors.dark.text2} />
            </View>
          </View>
        ) : (
          <Pressable style={styles.field} onPress={onOpenAccountPicker}>
            <Text style={styles.fieldLabel}>
              {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            </Text>
            <View style={styles.fieldValue}>
              {selectedAccount ? (
                <>
                  <View style={[styles.dot, { backgroundColor: selectedAccount.color ?? Colors.dark.border }]} />
                  <Text style={styles.fieldValueText}>{selectedAccount.name}</Text>
                </>
              ) : (
                <Text style={styles.fieldPlaceholder}>
                  {isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle}
                </Text>
              )}
              <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={Colors.dark.text2} />
            </View>
          </Pressable>
        )}
        {accountError ? <Text style={styles.err}>{accountError}</Text> : null}

        {/* To account */}
        {isTransferOrCC && (
          <>
            {locked ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{Strings.addTxToLabel}</Text>
                <View style={styles.fieldValue}>
                  {selectedToAccount && (
                    <View style={[styles.dot, { backgroundColor: selectedToAccount.color ?? Colors.dark.border }]} />
                  )}
                  <Text style={styles.fieldValueText}>
                    {selectedToAccount?.name ?? Strings.addTxPickToTitle}
                  </Text>
                  <MaterialCommunityIcons name="lock-outline" size={ms(18)} color={Colors.dark.text2} />
                </View>
              </View>
            ) : (
              <Pressable style={styles.field} onPress={onOpenToPicker}>
                <Text style={styles.fieldLabel}>{Strings.addTxToLabel}</Text>
                <View style={styles.fieldValue}>
                  {selectedToAccount ? (
                    <>
                      <View style={[styles.dot, { backgroundColor: selectedToAccount.color ?? Colors.dark.border }]} />
                      <Text style={styles.fieldValueText}>{selectedToAccount.name}</Text>
                    </>
                  ) : (
                    <Text style={styles.fieldPlaceholder}>{Strings.addTxPickToTitle}</Text>
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={Colors.dark.text2} />
                </View>
              </Pressable>
            )}
            {toAccountError ? <Text style={styles.err}>{toAccountError}</Text> : null}
          </>
        )}

        {/* Category */}
        {!isTransferOrCC && (
          <>
            <Pressable style={styles.field} onPress={onOpenCategoryPicker}>
              <Text style={styles.fieldLabel}>{Strings.addTxCategoryLabel}</Text>
              <View style={styles.fieldValue}>
                {selectedCategory ? (
                  <Text style={styles.fieldValueText}>{selectedCategory.name}</Text>
                ) : (
                  <Text style={styles.fieldPlaceholder}>{Strings.addTxPickCategoryTitle}</Text>
                )}
                <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={Colors.dark.text2} />
              </View>
            </Pressable>
            {categoryError ? <Text style={styles.err}>{categoryError}</Text> : null}
          </>
        )}

        {isUSD && (
          <ExchangeRateRow value={exchangeRate} onChange={setExchangeRate} error={rateError} />
        )}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{Strings.addTxNoteLabel}</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={Strings.addTxNotePlaceholder}
            placeholderTextColor={Colors.dark.text2}
          />
        </View>

        <Numpad onPress={handleNumpad} />

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.ctaLabel}>{Strings.addTxSaveCta}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  handle: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  kav: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  scrollContent: { gap: Spacing.sm, paddingBottom: Spacing.xxl },
  amountRow: { alignItems: 'center', paddingVertical: Spacing.md },
  amountText: { fontFamily: FontFamily.soraExtra, fontSize: ms(40) },
  field: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xxs,
  },
  fieldLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  fieldValue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  fieldValueText: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  fieldPlaceholder: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  dot: { width: ms(10), height: ms(10), borderRadius: ms(5) },
  noteInput: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
  },
  err: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
    marginTop: -Spacing.xxs,
  },
  cta: {
    height: Size.ctaHeight,
    backgroundColor: Colors.shared.cairoGold,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.8 },
  ctaLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(tabs)/transactions/transaction_form/transaction_form_body.tsx"
git commit -m "feat(m2d): TransactionFormBody shared presentational component"
```

---

## Task 9: Rewrite `transaction_form/index.tsx` — Add + Edit sheets

**Files:**
- Modify: `app/(app)/(tabs)/transactions/transaction_form/index.tsx`

Replace the entire file with a version that exports both `AddTransactionSheet` (refactored to use `TransactionFormBody`) and `EditTransactionSheet` (new).

- [ ] **Step 1: Rewrite `index.tsx`**

```typescript
import { useEffect } from 'react';
import Animated, { StyleSheet } from 'react-native-reanimated';
import { Pressable } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, Radius } from '@/constants/theme';
import type { Transaction } from '@/database/entities/transaction.entity';
import { useAddTransactionAnim } from './transaction_form.anim';
import { useAddTransaction } from './add_transaction.hook';
import { useEditTransaction } from './edit_transaction.hook';
import { useEditTransactionStore } from './edit_transaction.store';
import { TransactionFormBody } from './transaction_form_body';
import { AccountPickerSheet } from './components/account_picker_sheet';
import { CategoryPickerSheet } from './components/category_picker_sheet';

// ─── Add Transaction Sheet ────────────────────────────────────────────────────

interface AddProps {
  visible: boolean;
  onClose: () => void;
}

export function AddTransactionSheet({ visible, onClose }: AddProps) {
  const { sheetStyle, overlayStyle, openSheet, closeSheet } = useAddTransactionAnim();
  const hook = useAddTransaction(() => closeSheet(onClose));

  useEffect(() => {
    if (visible) openSheet();
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet(onClose)} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <TransactionFormBody
          title={Strings.addTxTitle}
          locked={false}
          type={hook.type}
          onSelectType={hook.setType}
          amountStr={hook.amountStr}
          handleNumpad={hook.handleNumpad}
          amountError={hook.errors.amount}
          selectedAccount={hook.selectedAccount}
          onOpenAccountPicker={() => hook.setShowAccountPicker(true)}
          accountError={hook.errors.account}
          selectedToAccount={hook.selectedToAccount}
          onOpenToPicker={() => hook.setShowToPicker(true)}
          toAccountError={hook.errors.toAccount}
          selectedCategory={hook.selectedCategory}
          onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
          categoryError={hook.errors.category}
          isUSD={hook.isUSD}
          exchangeRate={hook.exchangeRate}
          setExchangeRate={hook.setExchangeRate}
          rateError={hook.errors.rate}
          note={hook.note}
          setNote={hook.setNote}
          saving={hook.saving}
          onClose={() => closeSheet(onClose)}
          handleSave={hook.handleSave}
        />

        <AccountPickerSheet
          visible={hook.showAccountPicker}
          title={hook.isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle}
          accounts={hook.accountsForFrom}
          selectedId={hook.accountId}
          onSelect={hook.selectAccount}
          onClose={() => hook.setShowAccountPicker(false)}
        />
        <AccountPickerSheet
          visible={hook.showToPicker}
          title={Strings.addTxPickToTitle}
          accounts={hook.accountsForTo}
          selectedId={hook.toAccountId}
          excludeId={hook.accountId}
          onSelect={hook.selectToAccount}
          onClose={() => hook.setShowToPicker(false)}
        />
        <CategoryPickerSheet
          visible={hook.showCategoryPicker}
          title={Strings.addTxPickCategoryTitle}
          categories={hook.visibleCategories}
          selectedId={hook.categoryId}
          onSelect={hook.selectCategory}
          onClose={() => hook.setShowCategoryPicker(false)}
        />
      </Animated.View>
    </>
  );
}

// ─── Edit Transaction Sheet ───────────────────────────────────────────────────

interface EditProps {
  visible: boolean;
  onClose: () => void;
  tx: Transaction | null;
}

export function EditTransactionSheet({ visible, onClose, tx }: EditProps) {
  const { sheetStyle, overlayStyle, openSheet, closeSheet } = useAddTransactionAnim();

  useEffect(() => {
    if (visible) openSheet();
  }, [visible]);

  if (!visible || !tx) return null;

  return <EditSheetInner tx={tx} onClose={onClose} sheetStyle={sheetStyle} overlayStyle={overlayStyle} closeSheet={closeSheet} />;
}

// Inner component so we can call useEditTransaction with a guaranteed non-null tx
function EditSheetInner({
  tx,
  onClose,
  sheetStyle,
  overlayStyle,
  closeSheet,
}: {
  tx: Transaction;
  onClose: () => void;
  sheetStyle: object;
  overlayStyle: object;
  closeSheet: (cb?: () => void) => void;
}) {
  const hook = useEditTransaction(tx, () => closeSheet(onClose));
  const { showCategoryPicker, setShowCategoryPicker, selectCategory, visibleCategories, categoryId } = hook;

  return (
    <>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet(onClose)} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <TransactionFormBody
          title={Strings.editTxTitle}
          locked={true}
          type={hook.type}
          onSelectType={() => {}}
          amountStr={hook.amountStr}
          handleNumpad={hook.handleNumpad}
          amountError={hook.errors.amount}
          selectedAccount={hook.selectedAccount}
          onOpenAccountPicker={() => {}}
          accountError={undefined}
          selectedToAccount={hook.selectedToAccount}
          onOpenToPicker={() => {}}
          toAccountError={undefined}
          selectedCategory={hook.selectedCategory}
          onOpenCategoryPicker={() => setShowCategoryPicker(true)}
          categoryError={hook.errors.category}
          isUSD={hook.isUSD}
          exchangeRate={hook.exchangeRate}
          setExchangeRate={hook.setExchangeRate}
          rateError={hook.errors.rate}
          note={hook.note}
          setNote={hook.setNote}
          saving={hook.saving}
          onClose={() => closeSheet(onClose)}
          handleSave={hook.handleSave}
        />

        <CategoryPickerSheet
          visible={showCategoryPicker}
          title={Strings.addTxPickCategoryTitle}
          categories={visibleCategories}
          selectedId={categoryId}
          onSelect={selectCategory}
          onClose={() => setShowCategoryPicker(false)}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    zIndex: 11,
    maxHeight: '92%',
  },
});
```

**Note:** `useAddTransaction` currently returns `isTransferOrCC` and `accountId`/`toAccountId` as named fields. Verify by checking `add_transaction.hook.ts` — if those aren't in the return, add them. Looking at the existing hook: it returns `accountId`, `toAccountId`, `accountsForFrom`, `accountsForTo`, `showAccountPicker`, `setShowAccountPicker`, `showToPicker`, `setShowToPicker`, `showCategoryPicker`, `setShowCategoryPicker`, `selectAccount`, `selectToAccount`, `selectCategory`, `visibleCategories`. These are all present. Add `isTransferOrCC` to the hook's return object:

In `add_transaction.hook.ts`, find the return statement and add:
```typescript
isTransferOrCC,
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(tabs)/transactions/transaction_form/index.tsx" \
        "app/(app)/(tabs)/transactions/transaction_form/add_transaction.hook.ts"
git commit -m "feat(m2d): add EditTransactionSheet, refactor AddTransactionSheet to use TransactionFormBody"
```

---

## Task 10: Add `reload()` to detail hook + wire `ActionRow`

**Files:**
- Modify: `app/(app)/(tabs)/transactions/detail/detail.hook.ts`
- Modify: `app/(app)/(tabs)/transactions/detail/components/action_row.tsx`

- [ ] **Step 1: Add `reload()` to `useTransactionDetail`**

In `detail.hook.ts`, add a `reload` function that re-fetches the transaction by id:

Inside the `useTransactionDetail` function, the existing `useEffect` fetches on mount. Add a `reload` helper that triggers a re-fetch:

Add state:
```typescript
const [reloadKey, setReloadKey] = useState(0);
```

Replace the existing `useEffect` dependency array `[id, getById]` with `[id, getById, reloadKey]`.

Add the function:
```typescript
const reload = useCallback(() => setReloadKey((k) => k + 1), []);
```

Add `reload` to the return object:
```typescript
return {
  state,
  tx,
  derived,
  confirmVisible,
  deleting,
  openDeleteConfirm,
  closeDeleteConfirm,
  confirmDelete,
  reload,
};
```

- [ ] **Step 2: Update `ActionRow` to accept `onEdit` prop**

Replace the current `ActionRow` — which has a static disabled edit button — with a version that accepts `onEdit`:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { actionEntering, useDeletePressScale } from '../detail.anim';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
}

export function ActionRow({ onEdit, onDelete }: Props) {
  const { scale, onPressIn, onPressOut } = useDeletePressScale();
  const deleteAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={actionEntering} style={styles.row}>
      <Pressable style={styles.editWrap} onPress={onEdit}>
        <View style={styles.editBtn}>
          <MaterialCommunityIcons name="pencil-outline" size={ms(18)} color={Colors.dark.text1} />
          <Text style={styles.editLabel}>{Strings.editTransaction}</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onDelete}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.deleteWrap}
      >
        <Animated.View style={[styles.deleteBtn, deleteAnim]}>
          <MaterialCommunityIcons
            name="delete-outline"
            size={ms(18)}
            color={Colors.dark.negative}
          />
          <Text style={styles.deleteLabel}>{Strings.deleteTransaction}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  editWrap: { flex: 1 },
  editBtn: {
    flex: 1,
    minHeight: ms(52),
    borderRadius: Radius.cta,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  editLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  deleteWrap: { flex: 1 },
  deleteBtn: {
    flex: 1,
    minHeight: ms(52),
    borderRadius: Radius.cta,
    backgroundColor: Colors.dark.dangerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  deleteLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.negative,
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(tabs)/transactions/detail/detail.hook.ts" \
        "app/(app)/(tabs)/transactions/detail/components/action_row.tsx"
git commit -m "feat(m2d): add reload() to detail hook; wire ActionRow onEdit prop"
```

---

## Task 11: Wire Edit button on detail screen

**Files:**
- Modify: `app/(app)/(tabs)/transactions/detail/[id]/index.tsx`

- [ ] **Step 1: Update the detail screen**

Replace the full file:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { EditTransactionSheet } from '../../transaction_form';
import { useEditTransactionStore } from '../../transaction_form/edit_transaction.store';
import { ActionRow } from '../components/action_row';
import { DeleteConfirmDialog } from '../components/delete_confirm_dialog';
import { DetailHero } from '../components/detail_hero';
import { DetailRow } from '../components/detail_row';
import { DetailRowsCard } from '../components/detail_rows_card';
import { NotFoundState } from '../components/not_found_state';
import { useTransactionDetail } from '../detail.hook';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useTransactionDetail(id);

  const editVisible = useEditTransactionStore((s) => s.visible);
  const editingTx = useEditTransactionStore((s) => s.editingTx);
  const closeEdit = useEditTransactionStore((s) => s.close);

  function handleEdit() {
    if (d.tx) {
      useEditTransactionStore.getState().open(d.tx);
    }
  }

  function handleEditClose() {
    closeEdit();
    d.reload();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={Size.iconBack}
            color={Colors.dark.text2}
          />
        </Pressable>
        <Text style={styles.title}>{Strings.detailHeader}</Text>
        <View style={styles.backBtn} />
      </View>

      {d.state === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.shared.cairoGold} />
        </View>
      )}

      {d.state === 'notFound' && <NotFoundState />}

      {d.state === 'ready' && d.tx && d.derived && (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <DetailHero
              tx={d.tx}
              category={d.derived.category}
              amountText={d.derived.amountText}
              title={d.derived.title}
              dateTimeText={d.derived.dateTimeText}
            />

            <DetailRowsCard>
              <DetailRow
                icon="shape"
                label={Strings.detailCategory}
                value={d.derived.categoryLabel}
                badge={d.derived.categoryBadge}
              />
              <DetailRow
                icon="card-bulleted-outline"
                label={Strings.detailAccount}
                value={d.derived.accountLabel}
                sublabel={d.derived.accountTypeLabel}
              />
              <DetailRow
                icon="calendar"
                label={Strings.detailDateTime}
                value={d.derived.dateTimeText}
              />
              {d.derived.exchangeRateText && (
                <DetailRow
                  icon="earth"
                  label={Strings.detailExchangeRate}
                  value={d.derived.exchangeRateText}
                  badge={Strings.capturedBadge}
                />
              )}
              <DetailRow
                icon="text"
                label={Strings.detailNote}
                value={d.derived.noteText}
                muted={!d.tx.note}
                showDivider={false}
              />
            </DetailRowsCard>

            <ActionRow onEdit={handleEdit} onDelete={d.openDeleteConfirm} />
          </ScrollView>

          <DeleteConfirmDialog
            visible={d.confirmVisible}
            busy={d.deleting}
            onCancel={d.closeDeleteConfirm}
            onConfirm={d.confirmDelete}
          />

          <EditTransactionSheet
            visible={editVisible}
            onClose={handleEditClose}
            tx={editingTx}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: ms(40) },
});
```

**Note:** Add the missing `ScrollView` import from `react-native` — the original file used it but the replacement above references it without importing. Add it:
```typescript
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any path issues in the `EditTransactionSheet` import (`../../transaction_form`).

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(tabs)/transactions/detail/[id]/index.tsx"
git commit -m "feat(m2d): wire Edit button on detail screen with EditTransactionSheet"
```

---

## Task 12: Remove `editComingSoon` string + clean up

**Files:**
- Modify: `constants/strings.ts`

The `editComingSoon: 'Coming in M2d'` string is no longer used (ActionRow no longer renders it). Remove it to keep strings clean.

- [ ] **Step 1: Remove the string**

In `constants/strings.ts`, delete the line:
```typescript
  editComingSoon: 'Coming in M2d',
```

- [ ] **Step 2: Verify TypeScript compiles (no dangling references)**

```bash
npx tsc --noEmit
```

Expected: no errors. If there are errors about `editComingSoon` being referenced elsewhere, find those files and remove the reference.

- [ ] **Step 3: Verify tests pass**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add constants/strings.ts
git commit -m "chore(m2d): remove editComingSoon string (no longer needed)"
```

---

## Task 13: Coverage check + push

- [ ] **Step 1: Run coverage**

```bash
npm run test:coverage
```

Expected output includes:
- Lines ≥ 80%
- Functions ≥ 95%
- Branches = 100% (on the logic layer)

If thresholds fail, add missing test cases for uncovered branches in `update_transaction.query_executor.test.ts`.

- [ ] **Step 2: Push to feature branch**

```bash
git push -u origin claude/start-m2d-wYpK2
```

Expected: push succeeds.

---

## Self-Review Checklist

**Spec coverage:**
- ✅ `updateTransaction` DB function with all 4 types → Task 2
- ✅ Repository `update()` method → Task 3
- ✅ Store `updateTransaction` action → Task 3
- ✅ `editTxTitle` string → Task 1
- ✅ Folder rename `add_transaction/` → `transaction_form/` → Task 4
- ✅ `TypeTabs` disabled prop → Task 5
- ✅ `useEditTransactionStore` → Task 6
- ✅ `useEditTransaction` hook with pre-filled defaults, locked accounts, loadAccounts after save → Task 7
- ✅ `TransactionFormBody` shared presentational component → Task 8
- ✅ `EditTransactionSheet` export in index.tsx → Task 9
- ✅ `AddTransactionSheet` refactored to use `TransactionFormBody` → Task 9
- ✅ `reload()` on detail hook → Task 10
- ✅ `ActionRow` gets real `onEdit` Pressable, "Coming in M2d" caption removed → Task 10
- ✅ Detail screen wires Edit button, mounts `EditTransactionSheet`, `handleEditClose` calls `closeEdit` + `reload` → Task 11
- ✅ `editComingSoon` string removed → Task 12
- ✅ Coverage run → Task 13

**Type consistency check:**
- `UpdateTransactionInput` defined in Task 2 (`database/transactions.ts`), re-exported in Task 3 (repo → store). Used in Task 7 hook. ✅
- `useEditTransactionStore` defined in Task 6, imported in Tasks 7, 9, 11. ✅
- `TransactionFormBody` props defined in Task 8, consumed in Task 9. ✅
- `ActionRow` `onEdit` prop added in Task 10, passed in Task 11. ✅
- `reload()` added to detail hook in Task 10, called in Task 11. ✅
