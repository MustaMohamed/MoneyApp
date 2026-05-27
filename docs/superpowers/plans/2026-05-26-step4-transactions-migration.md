# Step 4 — Transactions Module Migration Implementation Plan

> **Historical execution record:** This plan was written for a one-time Claude
> worktree. Commands may contain absolute local paths or destructive cleanup
> steps. Do not replay commands verbatim. For future work, translate intent into
> repo-relative commands from the current repository root and preserve
> compatibility stubs unless a current plan explicitly removes them.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the entire transactions feature — data layer, store, screens, and shared components — from flat `database/`, `repositories/`, `store/`, and `screens/transactions/` into a self-contained `modules/transactions/` package, following the identical pattern established by `modules/accounts/` (Step 2) and `modules/categories/` (Step 3).

**Architecture:** Four waves mirror the accounts/categories pattern. Wave A copies the data layer (entity, queries, repository, store) into `modules/transactions/`. Wave B copies the shared component (`AccountPickerSheet` already lives in modules/accounts — no second copy needed; the `transaction_form/index.tsx` import is the only consumer that needs updating) and creates the public barrel. Wave C copies the full screens tree (with fix-as-you-go HeroUI `PressableFeedback` replacements and a `TextInput`→`Input` swap for the note field). Wave D deletes the originals, writes backward-compat stubs at the old paths, updates two app/ route one-liners, and updates all test imports. Each wave is its own atomic git commit.

**Tech Stack:** Expo bare workflow · TypeScript strict · Zustand v5 · expo-sqlite · HeroUI Native v1.0.3 (`PressableFeedback`, `Input`) · Unistyles 3 via Uniwind · Jest (logic-only `.ts` tests, no `.tsx`)

---

## Pre-flight: Key Findings from Code Inspection

Before touching any file, read these findings — they directly drive the steps below.

**`transaction_row.tsx` — `onPressIn`/`onPressOut` on `PressableFeedback`:** SAFE. The HeroUI source (`node_modules/heroui-native/src/components/pressable-feedback/pressable-feedback.tsx`) explicitly destructures and forwards both `onPressIn` and `onPressOut` callbacks, composing them with its internal animation handlers. Drop-in replacement, zero behaviour change.

**`transaction_form_body.tsx` — `TextInput` is a note field:** The single `TextInput` in this file is at the bottom of the `BottomSheetScrollView`, preceded by `<Text>…addTxNoteLabel</Text>`. It is NOT a `BottomSheetTextInput` (the amount keypad component, which lives in `AmountHero`, not here). Replace it with `Input` from `heroui-native` — import `{ Input }` from `heroui-native` and use `Input` with `value`, `onChangeText`, `placeholder`, `placeholderTextColor`, and `className` as props. Drop the `react-native` `TextInput` import from this file entirely.

**`components/sheets/account_picker_sheet.tsx`:** Already a backward-compat stub pointing to `modules/accounts/components/account_picker_sheet`. It is consumed by:
- `screens/transactions/transaction_form/index.tsx` (primary consumer — will be migrated in Wave C)
- `screens/commitments/components/commitment_form_body.tsx` (non-transaction consumer — stays on the old stub path; stub must not be deleted in Wave D)

Therefore Wave D does **not** delete or replace `components/sheets/account_picker_sheet.tsx`. It already points to the canonical location. The migrated `transaction_form/index.tsx` simply continues to import from `@/components/sheets/account_picker_sheet` or switches to `@/modules/accounts` barrel — either is fine. Use `@/modules/accounts` barrel for the migrated file since it now lives inside `modules/transactions/`.

**`exchange_rate_row.tsx`:** Already imports `Input` from `heroui-native` (not react-native). Only the outer `Pressable` wrapper needs replacing with `PressableFeedback` — the inner `Input` is already correct.

**`date_range_sheet.tsx`:** Has 3× `Pressable`: one `onReset` link and two Android date-trigger buttons. All three are purely functional (no animation callbacks) — straight replacements.

**`transaction_form_body.tsx` Pressables:** 3× `Pressable` (from-account row, to-account row, category row). All functional-only. Replace with `PressableFeedback`. The `disabled={locked}` prop maps to `isDisabled={locked}` on `PressableFeedback`.

**`type_tabs.tsx` Pressable:** Has `style={{ position: 'relative' }}` and an absolute-positioned child indicator. `PressableFeedback` is also a `Pressable` wrapper and supports arbitrary `style` — keep `style={{ position: 'relative' }}` as-is. The `disabled` prop maps to `isDisabled`.

**`AccountPickerSheet` is NOT being copied.** It already lives in `modules/accounts/components/account_picker_sheet` and is re-exported from the `modules/accounts` barrel. The transactions module imports it from `@/modules/accounts`, not `@/components/sheets/account_picker_sheet`, for files migrated into `modules/transactions/`.

---

## File Map

### Wave A — Data layer (new locations)

| Source | Destination |
|---|---|
| `database/entities/transaction.entity.ts` | `modules/transactions/entities/transaction.entity.ts` |
| `database/transactions.ts` | `modules/transactions/database/transactions.ts` |
| `repositories/transaction.repository.ts` | `modules/transactions/repositories/transaction.repository.ts` |
| `store/transaction.store.ts` | `modules/transactions/store/transaction.store.ts` |

### Wave B — Public barrel

| New file | Purpose |
|---|---|
| `modules/transactions/index.ts` | Public barrel: exports store, types, `TransactionListFilters`, `PAGE_SIZE` |

### Wave C — Screens tree (new locations + HeroUI fixes)

All files under `screens/transactions/` → `modules/transactions/screens/transactions/` (same relative paths within).

HeroUI fixes applied during the copy:
- All `Pressable` → `PressableFeedback` from `heroui-native` (10 locations across 8 files)
- `transaction_form_body.tsx` note `TextInput` → `Input` from `heroui-native`
- `transaction_form_body.tsx` `disabled={locked}` → `isDisabled={locked}` on the PressableFeedback rows
- `type_tabs.tsx` `disabled` → `isDisabled` on PressableFeedback
- All `@/store/transaction.store` imports → relative `../../store/transaction.store`
- All `@/database/transactions` imports → relative `../../database/transactions`
- All `@/database/entities/transaction.entity` imports → relative `../../entities/transaction.entity`
- `@/components/sheets/account_picker_sheet` in `transaction_form/index.tsx` → `@/modules/accounts` barrel import `{ AccountPickerSheet }`
- `@/screens/transactions/…` self-refs inside `screens/transactions/index.tsx` → same-module relative

### Wave D — Cleanup, stubs, and route updates

**Delete:**
- `screens/transactions/` (entire tree)
- `repositories/transaction.repository.ts` (no external callers; stubs below cover all)

**Backward-compat stubs (one-liner re-exports):**
- `store/transaction.store.ts`
- `database/entities/transaction.entity.ts`
- `database/transactions.ts`

**Route updates (already one-liners, change the import path):**
- `app/(app)/(tabs)/transactions/index.tsx`
- `app/(app)/(tabs)/transactions/detail/[id]/index.tsx`

**Do NOT touch:**
- `components/sheets/account_picker_sheet.tsx` — already a stub pointing to modules/accounts; commitments still uses it; leave it alone.
- `components/sheets/category_picker_sheet.tsx` — same situation, categories module.

### Test updates (own commit after Wave D)

All `__tests__/` files that import from the old paths need updated import paths.

---

## Task 1: Create `modules/transactions/entities/transaction.entity.ts`

**Files:**
- Create: `modules/transactions/entities/transaction.entity.ts`

- [ ] **Step 1: Create the directory and copy the entity**

The entity has zero imports that reference other local files (only `@/constants/enums`). Copy verbatim.

```typescript
// modules/transactions/entities/transaction.entity.ts
import type { Currency, TransactionType } from '@/constants/enums';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Face-value amount in the FROM account's own currency. Used for FROM-account balance mutations. */
  amount: number;
  currency: Currency;
  /** Always stored in EGP for net-worth / analytics calculations. */
  egp_amount: number;
  /**
   * Rate captured at save time; set whenever a USD↔EGP conversion is involved.
   *
   * For USD → USD transfers this is still required: `to_amount = amount` (same-
   * currency branch), but `egp_amount = amount × rate` is needed for net-worth
   * tracking — so the rate is captured solely for the egp_amount calculation.
   */
  exchange_rate: number | null;
  /**
   * Amount received by the TO account in the TO account's native currency.
   * Populated for transfer and cc_payment types; null for expense and income.
   *
   * Computation rules:
   *   EGP → EGP transfer:  to_amount = amount
   *   USD → EGP transfer:  to_amount = egp_amount   (EGP received)
   *   EGP → USD transfer:  to_amount = amount / rate (USD received)
   *   USD → USD transfer:  to_amount = amount
   *   cc_payment (any):    to_amount = egp_amount    (CC debt is always EGP-denominated)
   */
  to_amount: number | null;
  /**
   * Snapshot of the CC account's minimum_payment at the time of a cc_payment transaction.
   * Used during reversal so that changes to minimum_payment after the fact do not corrupt
   * the revolving_balance calculation.
   * null for non-cc_payment types.
   */
  minimum_payment_snapshot: number | null;
  /** Primary account: debit source for expense/transfer/cc_payment, credit target for income. */
  account_id: string;
  /** Transfer destination or CC account being paid. */
  to_account_id: string | null;
  /** null for transfer and cc_payment types. */
  category_id: string | null;
  note: string | null;
  /** ISO date string, e.g. '2026-05-01'. */
  transaction_date: string;
  /** HH:MM:SS, e.g. '14:30:00'. */
  transaction_time: string;
  /** FK to commitment_payments.id; set when this transaction fulfils a commitment payment. */
  commitment_payment_id: string | null;
  /**
   * FK to installments.id; set when this transaction is part of an installment plan.
   * Reserved by §7; populated by §8 once the installments table ships.
   */
  installment_id: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Run typecheck to confirm no issues**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm run typecheck 2>&1 | tail -5
```

Expected: same error count as baseline (entity is types-only, adding it won't introduce new errors).

---

## Task 2: Create `modules/transactions/database/transactions.ts`

**Files:**
- Create: `modules/transactions/database/transactions.ts`

- [ ] **Step 1: Create the file — update only the entity import path**

The original `database/transactions.ts` imports `Transaction` from `./entities/transaction.entity`. In the new location the entity is at `../entities/transaction.entity`. Everything else is unchanged.

```typescript
// modules/transactions/database/transactions.ts
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Currency } from '@/constants/enums';
import { TransactionType } from '@/constants/enums';

import type { Transaction } from '../entities/transaction.entity';

export interface MonthExpenseStats {
  totalEgp: number;
  egpNative: number;
  usdNative: number;
  count: number;
}

/**
 * Aggregate expense rows for one calendar month [yearMonth-01, nextMonth-01).
 * Returns:
 *  - totalEgp: SUM(egp_amount) across all currencies (each row's egp equivalent)
 *  - egpNative: SUM(amount) where currency='EGP' (true EGP-denominated spend)
 *  - usdNative: SUM(amount) where currency='USD' (true USD-denominated spend)
 *  - count: total expense rows
 * Excludes transfers, income, and CC payments — only true expenses.
 */
export async function getMonthExpenseStats(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<MonthExpenseStats> {
  const monthStart = `${yearMonth}-01`;
  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const row = await db.getFirstAsync<{
    total: number | null;
    egp_native: number | null;
    usd_native: number | null;
    cnt: number;
  }>(
    `SELECT
       COALESCE(SUM(egp_amount), 0) AS total,
       COALESCE(SUM(CASE WHEN currency = 'EGP' THEN amount ELSE 0 END), 0) AS egp_native,
       COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0) AS usd_native,
       COUNT(*) AS cnt
     FROM transactions
     WHERE type = 'expense'
       AND transaction_date >= ?
       AND transaction_date < ?`,
    [monthStart, nextMonthStart],
  );
  return {
    totalEgp: row?.total ?? 0,
    egpNative: row?.egp_native ?? 0,
    usdNative: row?.usd_native ?? 0,
    count: row?.cnt ?? 0,
  };
}

export async function addTransaction(db: SQLiteDatabase, tx: Transaction): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO transactions (
        id, type, amount, currency, egp_amount, exchange_rate,
        to_amount, minimum_payment_snapshot,
        account_id, to_account_id, category_id, note,
        transaction_date, transaction_time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.type,
        tx.amount,
        tx.currency,
        tx.egp_amount,
        tx.exchange_rate,
        tx.to_amount,
        tx.minimum_payment_snapshot,
        tx.account_id,
        tx.to_account_id,
        tx.category_id,
        tx.note,
        tx.transaction_date,
        tx.transaction_time,
        tx.created_at,
        tx.updated_at,
      ],
    );

    const now = tx.updated_at;

    if (tx.type === TransactionType.Expense) {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
    } else if (tx.type === TransactionType.Income) {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
    } else if (tx.type === TransactionType.Transfer) {
      const transferToAmt = tx.to_amount ?? tx.egp_amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [transferToAmt, now, tx.to_account_id],
      );
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- exhaustive narrowing; last branch is always CCPayment
    } else if (tx.type === TransactionType.CCPayment) {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
      const [cc] = await db.getAllAsync<{ revolving_balance: number | null }>(
        'SELECT revolving_balance FROM accounts WHERE id = ?',
        [tx.to_account_id],
      );
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- getAllAsync types T[] not (T|undefined)[]; runtime guard needed
      const revolving = cc?.revolving_balance ?? 0;
      const installmentDue = tx.minimum_payment_snapshot ?? 0;
      const toAmt = tx.to_amount ?? tx.egp_amount;
      const installmentCovered = Math.min(toAmt, installmentDue);
      const revolvingReduction = Math.max(0, toAmt - installmentCovered);
      const newRevolving = Math.max(0, revolving - revolvingReduction);
      await db.runAsync(
        `UPDATE accounts
           SET current_balance   = current_balance - ?,
               revolving_balance = ?,
               updated_at        = ?
         WHERE id = ?`,
        [toAmt, newRevolving, now, tx.to_account_id],
      );
    }
  });
}

export interface TransactionListQuery {
  limit?: number;
  offset?: number;
  type?: TransactionType;
  search?: string;
  accountIds?: string[];
  categoryIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  amountCurrency?: Currency;
}

const PAGE_SIZE_DEFAULT = 30;

function escapeLike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function buildInClause(n: number): string {
  return Array(n).fill('?').join(',');
}

export async function getTransactions(
  db: SQLiteDatabase,
  query: TransactionListQuery = {},
): Promise<Transaction[]> {
  const limit = query.limit ?? PAGE_SIZE_DEFAULT;
  const offset = query.offset ?? 0;

  const typeParam: string | null = query.type ?? null;
  const trimmed = query.search?.trim();
  const searchParam: string | null = trimmed && trimmed.length > 0 ? trimmed : null;
  const likePattern = searchParam !== null ? `%${escapeLike(searchParam)}%` : null;

  const accountIds = query.accountIds ?? [];
  const categoryIds = query.categoryIds ?? [];
  const accountListEmpty = accountIds.length === 0 ? 1 : 0;
  const categoryListEmpty = categoryIds.length === 0 ? 1 : 0;
  const accountIn = buildInClause(Math.max(accountIds.length, 1));
  const categoryIn = buildInClause(Math.max(categoryIds.length, 1));
  const accountParams = accountIds.length === 0 ? [''] : accountIds;
  const categoryParams = categoryIds.length === 0 ? [''] : categoryIds;

  const dateFrom = query.dateFrom ?? null;
  const dateTo = query.dateTo ?? null;

  const amountMin = query.amountMin ?? null;
  const amountMax = query.amountMax ?? null;
  const amountCurrency = query.amountCurrency ?? null;

  const sql = `
    SELECT t.* FROM transactions t
    WHERE (? IS NULL OR t.type = ?)
      AND (
        ? IS NULL
        OR t.note LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR EXISTS (
          SELECT 1 FROM accounts a
          WHERE a.id IN (t.account_id, t.to_account_id)
            AND a.name LIKE ? ESCAPE '\\' COLLATE NOCASE
        )
        OR EXISTS (
          SELECT 1 FROM categories c
          WHERE c.id = t.category_id
            AND c.name LIKE ? ESCAPE '\\' COLLATE NOCASE
        )
      )
      AND (
        ? = 1
        OR t.account_id    IN (${accountIn})
        OR t.to_account_id IN (${accountIn})
      )
      AND (
        ? = 1
        OR t.category_id IN (${categoryIn})
        -- NULL category_id rows (transfers, CC payments) are intentionally excluded
        -- when a category filter is active. This is by design per spec §6.3.
      )
      AND (? IS NULL OR t.transaction_date >= ?)
      AND (? IS NULL OR t.transaction_date <= ?)
      AND (? IS NULL OR (t.currency = ? AND t.amount >= ?))
      AND (? IS NULL OR (t.currency = ? AND t.amount <= ?))
    ORDER BY t.transaction_date DESC, t.transaction_time DESC
    LIMIT ? OFFSET ?
  `;

  return db.getAllAsync<Transaction>(sql, [
    typeParam,
    typeParam,
    searchParam,
    likePattern,
    likePattern,
    likePattern,
    accountListEmpty,
    ...accountParams,
    ...accountParams,
    categoryListEmpty,
    ...categoryParams,
    dateFrom,
    dateFrom,
    dateTo,
    dateTo,
    amountMin,
    amountCurrency,
    amountMin,
    amountMax,
    amountCurrency,
    amountMax,
    limit,
    offset,
  ]);
}

export async function getTransactionsByAccount(
  db: SQLiteDatabase,
  accountId: string,
  limit = 30,
  offset = 0,
): Promise<Transaction[]> {
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions
     WHERE account_id = ? OR to_account_id = ?
     ORDER BY transaction_date DESC, transaction_time DESC
     LIMIT ? OFFSET ?`,
    [accountId, accountId, limit, offset],
  );
}

export async function getTransactionById(
  db: SQLiteDatabase,
  id: string,
): Promise<Transaction | null> {
  const rows = await db.getAllAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function deleteTransaction(db: SQLiteDatabase, id: string): Promise<void> {
  const rows = await db.getAllAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  const tx = rows[0];
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- getAllAsync types T[] not (T|undefined)[]; runtime guard needed
  if (!tx) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);

    const now = new Date().toISOString();

    if (tx.type === TransactionType.Expense) {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
    } else if (tx.type === TransactionType.Income) {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
    } else if (tx.type === TransactionType.Transfer) {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
      const toAmt = tx.to_amount ?? tx.egp_amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [toAmt, now, tx.to_account_id],
      );
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- exhaustive narrowing; last branch is always CCPayment
    } else if (tx.type === TransactionType.CCPayment) {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
      const installmentDue = tx.minimum_payment_snapshot ?? 0;
      const toAmt = tx.to_amount ?? tx.egp_amount;
      const installmentCovered = Math.min(toAmt, installmentDue);
      const revolvingRestore = Math.max(0, toAmt - installmentCovered);
      await db.runAsync(
        `UPDATE accounts
           SET current_balance   = current_balance + ?,
               revolving_balance = revolving_balance + ?,
               updated_at        = ?
         WHERE id = ?`,
        [toAmt, revolvingRestore, now, tx.to_account_id],
      );
    }
  });
}

export interface UpdateTransactionInput {
  amount: number;
  currency: Currency;
  egp_amount: number;
  to_amount?: number | null;
  exchange_rate?: number | null;
  category_id?: string | null;
  note?: string | null;
  transaction_date: string;
  transaction_time: string;
}

export interface PeriodTotals {
  incomeEgp: number;
  expenseEgp: number;
  netEgp: number;
}

/**
 * Aggregate income and expense `egp_amount` for transactions in
 * `[from, to]` (inclusive on both ends). Excludes transfers and cc_payments
 * (they move money between user-owned accounts and do not change net worth).
 */
export async function getPeriodTotals(
  db: SQLiteDatabase,
  range: { from: string; to: string },
): Promise<PeriodTotals> {
  const row = await db.getFirstAsync<{
    income: number | null;
    expense: number | null;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income'  THEN egp_amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN egp_amount ELSE 0 END), 0) AS expense
     FROM transactions
     WHERE transaction_date >= ?
       AND transaction_date <= ?`,
    [range.from, range.to],
  );
  const incomeEgp = row?.income ?? 0;
  const expenseEgp = row?.expense ?? 0;
  return { incomeEgp, expenseEgp, netEgp: incomeEgp - expenseEgp };
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: string,
  updates: UpdateTransactionInput,
): Promise<void> {
  const rows = await db.getAllAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  const existing = rows[0];
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- getAllAsync types T[] not (T|undefined)[]; runtime guard needed
  if (!existing) return;

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (existing.type === TransactionType.Expense) {
      const delta = updates.amount - existing.amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.account_id],
      );
    } else if (existing.type === TransactionType.Income) {
      const delta = updates.amount - existing.amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.account_id],
      );
    } else if (existing.type === TransactionType.Transfer) {
      const deltaFrom = updates.amount - existing.amount;
      const newToAmt = updates.to_amount ?? updates.egp_amount;
      const oldToAmt = existing.to_amount ?? existing.egp_amount;
      const deltaTo = newToAmt - oldToAmt;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [deltaFrom, now, existing.account_id],
      );
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [deltaTo, now, existing.to_account_id],
      );
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- exhaustive narrowing; last branch is always CCPayment
    } else if (existing.type === TransactionType.CCPayment) {
      // Reverse old payment
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [existing.amount, now, existing.account_id],
      );
      const oldToAmt = existing.to_amount ?? existing.egp_amount;
      const oldInstallmentDue = existing.minimum_payment_snapshot ?? 0;
      const oldInstallmentCovered = Math.min(oldToAmt, oldInstallmentDue);
      const oldRevolvingRestore = Math.max(0, oldToAmt - oldInstallmentCovered);
      await db.runAsync(
        `UPDATE accounts
           SET current_balance   = current_balance + ?,
               revolving_balance = revolving_balance + ?,
               updated_at        = ?
         WHERE id = ?`,
        [oldToAmt, oldRevolvingRestore, now, existing.to_account_id],
      );

      // Apply new payment
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [updates.amount, now, existing.account_id],
      );
      const [ccForApply] = await db.getAllAsync<{
        revolving_balance: number | null;
        minimum_payment: number | null;
      }>('SELECT revolving_balance, minimum_payment FROM accounts WHERE id = ?', [
        existing.to_account_id,
      ]);
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- getAllAsync types T[] not (T|undefined)[]
      const newRevolving = ccForApply?.revolving_balance ?? 0;
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- getAllAsync types T[] not (T|undefined)[]
      const newMinPayment = ccForApply?.minimum_payment ?? 0;
      const newToAmt = updates.to_amount ?? updates.egp_amount;
      const newInstallmentCovered = Math.min(newToAmt, newMinPayment);
      const newRevolvingReduction = Math.max(0, newToAmt - newInstallmentCovered);
      const finalRevolving = Math.max(0, newRevolving - newRevolvingReduction);
      await db.runAsync(
        `UPDATE accounts
           SET current_balance   = current_balance - ?,
               revolving_balance = ?,
               updated_at        = ?
         WHERE id = ?`,
        [newToAmt, finalRevolving, now, existing.to_account_id],
      );
    }

    let newMinPaymentSnapshot: number | null = null;
    if (existing.type === TransactionType.CCPayment) {
      const [ccSnap] = await db.getAllAsync<{ minimum_payment: number | null }>(
        'SELECT minimum_payment FROM accounts WHERE id = ?',
        [existing.to_account_id],
      );
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- getAllAsync types T[] not (T|undefined)[]
      newMinPaymentSnapshot = ccSnap?.minimum_payment ?? null;
    }

    await db.runAsync(
      `UPDATE transactions
         SET amount = ?, currency = ?, egp_amount = ?, exchange_rate = ?,
             to_amount = ?, minimum_payment_snapshot = ?,
             category_id = ?, note = ?, transaction_date = ?, transaction_time = ?,
             updated_at = ?
       WHERE id = ?`,
      [
        updates.amount,
        updates.currency,
        updates.egp_amount,
        updates.exchange_rate ?? null,
        updates.to_amount ?? null,
        newMinPaymentSnapshot,
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

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm run typecheck 2>&1 | tail -5
```

Expected: no new errors introduced.

---

## Task 3: Create `modules/transactions/repositories/transaction.repository.ts`

**Files:**
- Create: `modules/transactions/repositories/transaction.repository.ts`

- [ ] **Step 1: Create the file — update import paths only**

Import paths change:
- `@/database/client` stays as `@/database/client` (shared infrastructure, not being migrated)
- `@/database/entities/transaction.entity` → `../entities/transaction.entity`
- `@/database/transactions` → `../database/transactions`

```typescript
// modules/transactions/repositories/transaction.repository.ts
import uuid from 'react-native-uuid';

import { Currency, TransactionType } from '@/constants/enums';
import { getDb } from '@/database/client';
import type { Transaction } from '../entities/transaction.entity';
import {
  addTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  getTransactionsByAccount,
  updateTransaction,
  type TransactionListQuery,
  type UpdateTransactionInput,
} from '../database/transactions';

export type { TransactionListQuery, UpdateTransactionInput };

export interface NewTransactionInput {
  type: TransactionType;
  amount: number;
  currency: Currency;
  /** EGP equivalent — amount for EGP accounts, amount × rate for USD accounts. */
  egp_amount: number;
  /**
   * Amount received by the TO account in its native currency.
   * Required for transfer and cc_payment; omit for expense and income.
   *
   *   EGP → EGP: amount
   *   USD → EGP: egp_amount
   *   EGP → USD: amount / rate
   *   USD → USD: amount
   *   cc_payment: egp_amount (CC debt is EGP-denominated)
   */
  to_amount?: number;
  /** Required when a USD↔EGP conversion is involved. */
  exchange_rate?: number;
  account_id: string;
  /** Required for transfer and cc_payment. */
  to_account_id?: string;
  /** Required for expense and income. */
  category_id?: string;
  note?: string;
  /** ISO date string, defaults to today. */
  transaction_date?: string;
  /** HH:MM:SS, defaults to current time. */
  transaction_time?: string;
}

export interface ITransactionRepository {
  getAll(query?: TransactionListQuery): Promise<Transaction[]>;
  getByAccount(accountId: string, limit?: number, offset?: number): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  add(data: NewTransactionInput): Promise<Transaction>;
  delete(id: string): Promise<void>;
  update(id: string, data: UpdateTransactionInput): Promise<void>;
}

export class TransactionRepository implements ITransactionRepository {
  async getAll(query: TransactionListQuery = {}): Promise<Transaction[]> {
    const db = await getDb();
    return getTransactions(db, query);
  }

  async getByAccount(accountId: string, limit = 30, offset = 0): Promise<Transaction[]> {
    const db = await getDb();
    return getTransactionsByAccount(db, accountId, limit, offset);
  }

  async getById(id: string): Promise<Transaction | null> {
    const db = await getDb();
    return getTransactionById(db, id);
  }

  async add(data: NewTransactionInput): Promise<Transaction> {
    const db = await getDb();
    const id = String(uuid.v4());
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const time = now.slice(11, 19);

    // Snapshot the CC account's minimum_payment at save time so reversals remain accurate
    // even if the user later changes the CC account's minimum_payment.
    let minimumPaymentSnapshot: number | null = null;
    if (data.type === TransactionType.CCPayment && data.to_account_id) {
      const rows = await db.getAllAsync<{ minimum_payment: number | null }>(
        'SELECT minimum_payment FROM accounts WHERE id = ?',
        [data.to_account_id],
      );
      minimumPaymentSnapshot = rows[0]?.minimum_payment ?? null;
    }

    const transaction: Transaction = {
      id,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      egp_amount: data.egp_amount,
      exchange_rate: data.exchange_rate ?? null,
      to_amount: data.to_amount ?? null,
      minimum_payment_snapshot: minimumPaymentSnapshot,
      account_id: data.account_id,
      to_account_id: data.to_account_id ?? null,
      category_id: data.category_id ?? null,
      note: data.note ?? null,
      transaction_date: data.transaction_date ?? today,
      transaction_time: data.transaction_time ?? time,
      commitment_payment_id: null,
      installment_id: null,
      created_at: now,
      updated_at: now,
    };

    await addTransaction(db, transaction);
    return transaction;
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await deleteTransaction(db, id);
  }

  async update(id: string, data: UpdateTransactionInput): Promise<void> {
    const db = await getDb();
    await updateTransaction(db, id, data);
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm run typecheck 2>&1 | tail -5
```

Expected: no new errors.

---

## Task 4: Create `modules/transactions/store/transaction.store.ts`

**Files:**
- Create: `modules/transactions/store/transaction.store.ts`

- [ ] **Step 1: Create the file — update import paths**

Import paths change:
- `@/database/entities/transaction.entity` → `../entities/transaction.entity`
- `@/repositories/transaction.repository` → `../repositories/transaction.repository`

```typescript
// modules/transactions/store/transaction.store.ts
import { create } from 'zustand';

import { Currency, type TransactionType } from '@/constants/enums';
import type { Transaction } from '../entities/transaction.entity';
import {
  TransactionRepository,
  type ITransactionRepository,
  type NewTransactionInput,
  type TransactionListQuery,
  type UpdateTransactionInput,
} from '../repositories/transaction.repository';

export type { Transaction, NewTransactionInput, TransactionListQuery, UpdateTransactionInput };

export const PAGE_SIZE = 30;

export interface TransactionListFilters {
  type?: TransactionType;
  search?: string;
  accountIds?: string[];
  categoryIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  amountCurrency?: Currency;
}

const INITIAL_STATE = {
  transactions: [] as Transaction[],
  hasMore: false,
  loading: false,
  query: {} as TransactionListFilters,
};

interface TransactionStore {
  state: typeof INITIAL_STATE;

  setQuery: (q: TransactionListFilters) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;

  getById: (id: string) => Promise<Transaction | null>;
  addTransaction: (data: NewTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, data: UpdateTransactionInput) => Promise<void>;
  reset: () => void;
}

export function createTransactionStore(repo: ITransactionRepository) {
  let requestId = 0;

  return create<TransactionStore>((set, get) => {
    async function fetchPage(
      filters: TransactionListFilters,
      offset: number,
      mode: 'replace' | 'append',
    ) {
      const myId = ++requestId;
      set((s) => ({ state: { ...s.state, loading: true } }));
      try {
        const rows = await repo.getAll({ ...filters, limit: PAGE_SIZE, offset });
        if (myId !== requestId) return;
        const hasMore = rows.length === PAGE_SIZE;
        if (mode === 'replace') {
          set({ state: { transactions: rows, hasMore, loading: false, query: filters } });
        } else {
          set((s) => ({
            state: {
              ...s.state,
              transactions: [...s.state.transactions, ...rows],
              hasMore,
              loading: false,
            },
          }));
        }
      } catch (err) {
        if (myId === requestId) set((s) => ({ state: { ...s.state, loading: false } }));
        console.error('[transactionStore] fetch failed:', err);
        throw err;
      }
    }

    return {
      state: INITIAL_STATE,

      setQuery: (q) => fetchPage(q, 0, 'replace'),

      refresh: () => fetchPage(get().state.query, 0, 'replace'),

      loadMore: async () => {
        const { hasMore, loading, query, transactions } = get().state;
        if (!hasMore || loading) return;
        await fetchPage(query, transactions.length, 'append');
      },

      getById: async (id) => repo.getById(id),

      addTransaction: async (data) => {
        const tx = await repo.add(data);
        await get()
          .refresh()
          .catch((err) => console.error('[transactionStore] post-add refresh failed:', err));
        return tx;
      },

      deleteTransaction: async (id) => {
        await repo.delete(id);
        await get()
          .refresh()
          .catch((err) => console.error('[transactionStore] post-delete refresh failed:', err));
      },

      updateTransaction: async (id, data) => {
        await repo.update(id, data);
        await get()
          .refresh()
          .catch((err) => console.error('[transactionStore] post-update refresh failed:', err));
      },

      reset: () => {
        requestId++;
        set({ state: INITIAL_STATE });
      },
    };
  });
}

export const useTransactionStore = createTransactionStore(new TransactionRepository());
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm run typecheck 2>&1 | tail -5
```

Expected: no new errors.

---

## Task 5: Create `modules/transactions/index.ts` (public barrel)

**Files:**
- Create: `modules/transactions/index.ts`

- [ ] **Step 1: Create the barrel**

Export only what external consumers need: the store, its public types, and `PAGE_SIZE`. The repository and database helpers are internal; access them through the store only. `Transaction` type is needed externally (used in screen props and commitment integration).

```typescript
// modules/transactions/index.ts
// Public API — store and shared types only.
// TransactionRepository and database helpers are internal;
// access transaction data through the store.
export {
  createTransactionStore,
  useTransactionStore,
  PAGE_SIZE,
} from './store/transaction.store';
export type {
  Transaction,
  NewTransactionInput,
  TransactionListQuery,
  UpdateTransactionInput,
  TransactionListFilters,
} from './store/transaction.store';
```

- [ ] **Step 2: Commit Wave A**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add modules/transactions/ && git commit -m "refactor(transactions): Wave A — data layer + store into modules/transactions/"
```

Expected: commit succeeds; `modules/transactions/entities/`, `modules/transactions/database/`, `modules/transactions/repositories/`, `modules/transactions/store/`, `modules/transactions/index.ts` are in tree.

---

## Task 6: Copy screens tree (Wave C, part 1 — root level + components/)

This is the largest task. We copy the screens tree into `modules/transactions/screens/transactions/` and apply HeroUI fixes as we go. Work sub-folder by sub-folder.

**Files:**
- Create: all files in `modules/transactions/screens/transactions/` and subdirectories
- HeroUI fix: `Pressable` → `PressableFeedback` in multiple files

Start with the root-level screens files and the `components/` directory.

- [ ] **Step 1: Copy `transactions.anim.ts` — no changes needed**

```typescript
// modules/transactions/screens/transactions/transactions.anim.ts
import { useCallback } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Row press scale animation, identical contract to V1's transactions.anim.ts.
 * Used by TransactionRow and TransferFlowCard cells.
 */
export function useRowPressScale() {
  const scale = useSharedValue(1);
  const onPressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 100 });
  }, [scale]);
  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 120 });
  }, [scale]);
  return { scale, onPressIn, onPressOut };
}
```

- [ ] **Step 2: Copy `components/transaction_row.anim.ts` — re-export from parent anim**

```typescript
// modules/transactions/screens/transactions/components/transaction_row.anim.ts
export { useRowPressScale } from '../transactions.anim';
```

- [ ] **Step 3: Copy remaining screens root files verbatim**

`transactions.helpers.ts`, `transactions.hook.ts`, `transactions.state.ts`, `transactions.store.ts` — copy verbatim; all their internal imports use relative paths (e.g., `./transactions.helpers`, `./filter/filter.state`) which remain valid, and their absolute imports (`@/store/transaction.store`, `@/modules/categories`, `@/modules/accounts`) stay the same. The only absolute import that changes is `@/store/transaction.store` → use `@/modules/transactions/store/transaction.store`.

For each file, copy it to `modules/transactions/screens/transactions/<name>` and replace:
- `from '@/store/transaction.store'` → `from '@/modules/transactions/store/transaction.store'`

Check `transactions.hook.ts` and `transactions.store.ts` for this import:

```bash
grep -n "@/store/transaction.store" /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/screens/transactions/transactions.hook.ts /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/screens/transactions/transactions.store.ts 2>/dev/null
```

Copy each file. For any file that imports `@/store/transaction.store`, replace with `@/modules/transactions/store/transaction.store`. For any that import `@/database/entities/transaction.entity`, replace with `@/modules/transactions/entities/transaction.entity`.

- [ ] **Step 4: Copy `components/date_header.tsx` — no changes needed**

Copy verbatim (only imports from `@/components/ui/text` and `@/constants/strings`).

- [ ] **Step 5: Copy `components/totals_strip.tsx` — no changes needed**

Copy verbatim (inspect: likely only imports Text, Strings, constants).

- [ ] **Step 6: Copy `components/type_chips.tsx` — no changes needed**

Copy verbatim (inspect: likely uses HeroUI components or just Text + Pressable; if it uses Pressable without animation callbacks, replace with PressableFeedback).

Run before copying:
```bash
grep -n "Pressable" /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/screens/transactions/components/type_chips.tsx
```

If `Pressable` found with no `onPressIn`/`onPressOut`: replace with `PressableFeedback` from `heroui-native`.

- [ ] **Step 7: Copy `components/tx_delete_confirm_sheet.tsx` — no changes needed**

Copy verbatim.

- [ ] **Step 8: Copy `components/search_row.tsx` — 2× Pressable → PressableFeedback**

The clear button and filter button are both simple `onPress` pressables. Replace both.

```typescript
// modules/transactions/screens/transactions/components/search_row.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

interface Props {
  value: string;
  onChange: (s: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

export function SearchRow({
  value,
  onChange,
  onClear,
  onOpenFilter,
  activeFilterCount,
}: Props): React.ReactElement {
  return (
    <View className="mt-3 flex-row items-center gap-2 px-4">
      <View className="flex-1">
        <Input
          value={value}
          onChangeText={onChange}
          placeholder={Strings.searchTransactionsPlaceholder}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={Strings.searchTransactionsPlaceholder}
        />
        {value.length > 0 ? (
          <PressableFeedback
            onPress={onClear}
            accessibilityLabel="Clear search"
            className="absolute top-2.5 right-2 h-7 w-7 items-center justify-center"
          >
            <MaterialCommunityIcons name="close-circle" size={16} color="#999" />
          </PressableFeedback>
        ) : null}
      </View>
      <PressableFeedback
        onPress={onOpenFilter}
        accessibilityRole="button"
        accessibilityLabel={`Filter${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
        className="bg-default/40 relative h-10 w-10 items-center justify-center rounded-xl"
      >
        <MaterialCommunityIcons name="tune-variant" size={18} color="#F0EEE6" />
        {activeFilterCount > 0 ? (
          <View className="bg-accent absolute -top-1 -right-1 min-w-[16px] items-center rounded-full px-1.5">
            <Text className="font-inter text-accent-foreground text-[9px] font-bold">
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </PressableFeedback>
    </View>
  );
}
```

- [ ] **Step 9: Copy `components/date_range_sheet.tsx` — 3× Pressable → PressableFeedback**

The three Pressables are: the onReset link, the Android from-trigger, the Android to-trigger. Replace all three. Remove `Pressable` from the `react-native` import (only `Platform` and `View` remain needed from RN; `DateTimePicker` etc. come from their own packages).

```typescript
// modules/transactions/screens/transactions/components/date_range_sheet.tsx
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { PressableFeedback } from 'heroui-native';
import React, { useState, useEffect } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';

interface Props {
  isOpen: boolean;
  initialFrom?: string;
  initialTo?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (from: string, to: string) => void;
  onReset?: () => void;
}

export function DateRangeSheet({
  isOpen,
  initialFrom,
  initialTo,
  onOpenChange,
  onConfirm,
  onReset,
}: Props): React.ReactElement {
  const [from, setFrom] = useState<Date>(() => (initialFrom ? new Date(initialFrom) : new Date()));
  const [to, setTo] = useState<Date>(() => (initialTo ? new Date(initialTo) : new Date()));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFrom(initialFrom ? new Date(initialFrom) : new Date());
      setTo(initialTo ? new Date(initialTo) : new Date());
      setShowFromPicker(false);
      setShowToPicker(false);
    }
  }, [isOpen, initialFrom, initialTo]);

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={Strings.dateRangePickerTitle}
      snapPoints={['55%']}
      footer={
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              variant="ghost"
              label={Strings.dateRangePickerCancel}
              onPress={() => onOpenChange(false)}
            />
          </View>
          <View className="flex-1">
            <Button
              variant="primary"
              label={Strings.dateRangePickerConfirm}
              onPress={() => onConfirm(toLocalDateString(from), toLocalDateString(to))}
            />
          </View>
        </View>
      }
    >
      {onReset ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: 16,
            paddingBottom: 4,
          }}
        >
          <PressableFeedback
            testID="date-range-reset"
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Reset date range"
          >
            <Text className="font-inter text-accent text-[12px] font-semibold">
              {Strings.filterReset}
            </Text>
          </PressableFeedback>
        </View>
      ) : null}
      {isOpen ? (
        <View className="px-4 py-2">
          <Text className="font-inter text-foreground/60 mb-1 text-[10px] font-semibold uppercase">
            {Strings.dateRangePickerFromLabel}
          </Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={from}
              mode="date"
              display="inline"
              onChange={(_, d) => d && setFrom(d)}
              maximumDate={to}
            />
          ) : (
            <>
              <PressableFeedback
                testID="date-range-from-trigger"
                onPress={() => setShowFromPicker(true)}
                className="border-border bg-default/30 rounded-lg border px-3 py-3"
              >
                <Text className="font-inter text-foreground text-[14px]">
                  {formatLongDate(toLocalDateString(from))}
                </Text>
              </PressableFeedback>
              {showFromPicker ? (
                <DateTimePicker
                  value={from}
                  mode="date"
                  display="default"
                  onChange={(event: DateTimePickerEvent, d?: Date) => {
                    setShowFromPicker(false);
                    if (event.type === 'set' && d) setFrom(d);
                  }}
                  maximumDate={to}
                />
              ) : null}
            </>
          )}
          <Text className="font-inter text-foreground/60 mt-4 mb-1 text-[10px] font-semibold uppercase">
            {Strings.dateRangePickerToLabel}
          </Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={to}
              mode="date"
              display="inline"
              onChange={(_, d) => d && setTo(d)}
              minimumDate={from}
              maximumDate={new Date()}
            />
          ) : (
            <>
              <PressableFeedback
                testID="date-range-to-trigger"
                onPress={() => setShowToPicker(true)}
                className="border-border bg-default/30 rounded-lg border px-3 py-3"
              >
                <Text className="font-inter text-foreground text-[14px]">
                  {formatLongDate(toLocalDateString(to))}
                </Text>
              </PressableFeedback>
              {showToPicker ? (
                <DateTimePicker
                  value={to}
                  mode="date"
                  display="default"
                  onChange={(event: DateTimePickerEvent, d?: Date) => {
                    setShowToPicker(false);
                    if (event.type === 'set' && d) setTo(d);
                  }}
                  minimumDate={from}
                  maximumDate={new Date()}
                />
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
```

- [ ] **Step 10: Copy `components/month_carousel.tsx` — 1× Pressable → PressableFeedback**

The single Pressable is a pill button. Replace. Note: it uses `onLayout` — `PressableFeedback` forwards `onLayout` via `handleLayout` internally, so this is safe.

```typescript
// modules/transactions/screens/transactions/components/month_carousel.tsx
import { PressableFeedback } from 'heroui-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

import {
  computeCarouselPills,
  type CarouselPill,
  type CarouselSelection,
} from '../transactions.helpers';

interface Props {
  now?: Date;
  selection: CarouselSelection;
  customRange: { from: string; to: string } | null;
  onSelect: (s: CarouselSelection) => void;
  onOpenCustom: () => void;
}

function pillKey(p: CarouselPill): string {
  if (p.kind === 'all') return 'all';
  if (p.kind === 'custom') return 'custom';
  return p.yearMonth;
}

function pillLabel(p: CarouselPill, customRange: { from: string; to: string } | null): string {
  if (p.kind === 'all') return Strings.carouselAllLabel;
  if (p.kind === 'custom') {
    return customRange
      ? Strings.carouselCustomActiveLabel(customRange.from, customRange.to)
      : Strings.carouselCustomLabel;
  }
  return Strings.carouselMonthShort(p.yearMonth);
}

function isSelected(p: CarouselPill, sel: CarouselSelection): boolean {
  if (p.kind === 'all') return sel.type === 'all';
  if (p.kind === 'custom') return sel.type === 'custom';
  return sel.type === 'month' && sel.yearMonth === p.yearMonth;
}

function selectionKey(sel: CarouselSelection): string {
  if (sel.type === 'all') return 'all';
  if (sel.type === 'custom') return 'custom';
  return sel.yearMonth;
}

export function MonthCarousel({
  now = new Date(),
  selection,
  customRange,
  onSelect,
  onOpenCustom,
}: Props): React.ReactElement {
  const pills = useMemo(() => computeCarouselPills(now), [now]);
  const scrollRef = useRef<ScrollView>(null);
  const [pillOffsets, setPillOffsets] = useState<Record<string, number>>({});

  const currentKey = selectionKey(selection);

  useEffect(() => {
    const offset = pillOffsets[currentKey];
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- runtime guard for Record index access
    if (offset !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ x: offset, animated: false });
    }
  }, [currentKey, pillOffsets]);

  const snapToOffsets = useMemo(
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- runtime guard for Record index access
    () => pills.map((p) => pillOffsets[pillKey(p)]).filter((x): x is number => x !== undefined),
    [pills, pillOffsets],
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
      decelerationRate="fast"
      snapToOffsets={snapToOffsets.length > 0 ? snapToOffsets : undefined}
      snapToAlignment="start"
    >
      {pills.map((p) => {
        const key = pillKey(p);
        const selected = isSelected(p, selection);
        const label = pillLabel(p, customRange);
        const a11y = `${label}${selected ? ', selected' : ''}, period filter`;
        const handlePress = () => {
          if (p.kind === 'all') return onSelect({ type: 'all' });
          if (p.kind === 'custom') return onOpenCustom();
          return onSelect({ type: 'month', yearMonth: p.yearMonth });
        };
        return (
          <PressableFeedback
            key={key}
            onPress={handlePress}
            onLayout={(event) => {
              const x = event.nativeEvent.layout.x;
              setPillOffsets((prev) => {
                if (prev[key] === x) return prev;
                return { ...prev, [key]: x };
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={a11y}
            accessibilityState={{ selected }}
            className={
              selected
                ? 'bg-accent rounded-full px-2.5 py-1.5'
                : 'bg-default/40 rounded-full px-2.5 py-1.5'
            }
          >
            <Text
              className={
                selected
                  ? 'font-inter text-accent-foreground text-[11px] font-bold'
                  : 'font-inter text-foreground/60 text-[11px] font-medium'
              }
            >
              {label}
            </Text>
          </PressableFeedback>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 11: Copy `components/transaction_row.tsx` — 1× Pressable → PressableFeedback (safe: onPressIn/onPressOut supported)**

Replace `Pressable` with `PressableFeedback`. The `onPressIn`/`onPressOut` callbacks from `useRowPressScale` are forwarded correctly by PressableFeedback's internal handlers. The `Animated.View` wrapper with `animStyle` stays — it's the scale animation target, separate from the PressableFeedback's own built-in scale. To avoid double-scaling, pass `animation={false}` on `PressableFeedback` to disable its built-in scale (our manual Reanimated scale via `useRowPressScale` is the intended animation; PressableFeedback's built-in scale would conflict).

```typescript
// modules/transactions/screens/transactions/components/transaction_row.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { TypeBadge } from '@/components/ui/type_badge';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { formatTime12h } from '@/utils/format_time_12h';
import { toIconName } from '@/utils/icon_name_guard';

import { useRowPressScale } from './transaction_row.anim';
import type { Transaction } from '../../../entities/transaction.entity';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const FALLBACK_ICON: IconName = 'shape-outline';
const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

function categoryTitle(tx: Transaction, category?: Category): string {
  switch (tx.type) {
    case TransactionType.Expense:
    case TransactionType.Income:
      return category?.name ?? Strings.uncategorized;
    case TransactionType.Transfer:
      return Strings.transferTitle;
    case TransactionType.CCPayment:
      return Strings.addTxTypeCCPayment;
  }
}

function accountContext(tx: Transaction, account?: Account, toAccount?: Account): string {
  const fromName = account?.name ?? Strings.unknownAccount;
  switch (tx.type) {
    case TransactionType.Expense:
    case TransactionType.Income:
      return fromName;
    case TransactionType.Transfer:
    case TransactionType.CCPayment:
      return `${fromName} → ${toAccount?.name ?? Strings.unknownAccount}`;
  }
}

function signPrefix(type: TransactionType): string {
  if (type === TransactionType.Income) return '+';
  if (type === TransactionType.Expense) return '−';
  return '';
}

function amountColorClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.Income:
      return 'text-success';
    case TransactionType.Expense:
      return 'text-danger';
    case TransactionType.Transfer:
      return 'text-info';
    case TransactionType.CCPayment:
      return 'text-accent-cc';
  }
}

function iconBgClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.Income:
      return 'bg-success/15';
    case TransactionType.Expense:
      return 'bg-danger/15';
    case TransactionType.Transfer:
      return 'bg-info/15';
    case TransactionType.CCPayment:
      return 'bg-accent-cc/15';
  }
}

function pickIcon(tx: Transaction, category?: Category): IconName {
  if (tx.type === TransactionType.Transfer) return 'swap-horizontal';
  if (tx.type === TransactionType.CCPayment) return 'credit-card-refund';
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- category can be undefined at runtime
  return toIconName(category?.icon, FALLBACK_ICON);
}

export function TransactionRow({
  tx,
  account,
  toAccount,
  category,
  onPress,
  onEdit,
  onDelete,
}: Props): React.ReactElement {
  const { scale, onPressIn, onPressOut } = useRowPressScale();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const title = useMemo(() => categoryTitle(tx, category), [tx, category]);
  // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- || is intentional: empty string maps to null (blank note → no note row rendered)
  const note = tx.note?.trim() || null;
  const ctx = useMemo(() => accountContext(tx, account, toAccount), [tx, account, toAccount]);

  const showEquiv = tx.currency !== Currency.EGP;
  const equivPrefix =
    tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment ? '→ ' : '≈ ';
  const nativeText = `${signPrefix(tx.type)}${numberFmt.format(tx.amount)} ${tx.currency}`;
  const egpText = `${equivPrefix}${numberFmt.format(tx.egp_amount)} EGP`;
  const rateText = tx.exchange_rate != null ? `@ ${tx.exchange_rate}` : '';

  const actions: SwipeAction[] = [
    {
      key: 'edit',
      label: Strings.swipeEdit,
      icon: 'pencil-outline',
      variant: 'neutral',
      onPress: onEdit,
    },
    {
      key: 'delete',
      label: Strings.swipeDelete,
      icon: 'trash-can-outline',
      variant: 'destructive',
      onPress: onDelete,
    },
  ];

  return (
    <SwipeableRow rowId={tx.id} actions={actions} accessibilityLabel={`${title}, ${nativeText}`}>
      {/*
        animation={false} disables PressableFeedback's built-in scale so it
        does not conflict with the manual Reanimated scale from useRowPressScale.
        onPressIn/onPressOut are forwarded by PressableFeedback to our callbacks.
      */}
      <PressableFeedback
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        animation={false}
      >
        <Animated.View style={[animStyle]} className="border-separator border-b px-4 py-3">
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} className="gap-3">
            <View
              className={`mt-0.5 h-9 w-9 items-center justify-center rounded-lg ${iconBgClass(tx.type)}`}
            >
              <MaterialCommunityIcons
                name={pickIcon(tx, category)}
                size={18}
                color={category?.color ?? GoldTokens[500]}
              />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="font-sora text-foreground text-[13px] font-bold">{title}</Text>
                {tx.commitment_payment_id != null ? <TypeBadge type="commitment" /> : null}
              </View>
              <Text
                className="font-inter text-foreground/55 mt-1 text-[10.5px] font-medium"
                numberOfLines={1}
              >
                {ctx}
              </Text>
            </View>
            <View className="items-end">
              <Text className={`font-sora text-[14px] font-bold ${amountColorClass(tx.type)}`}>
                {nativeText}
              </Text>
              {showEquiv ? (
                <Text className="font-inter text-foreground/60 mt-0.5 text-[10px] font-medium">
                  {egpText}
                  {rateText ? <Text className="opacity-70"> {rateText}</Text> : null}
                </Text>
              ) : null}
              <Text className="font-inter text-foreground/40 mt-0.5 text-[10px]">
                {formatTime12h(tx.transaction_time)}
              </Text>
            </View>
          </View>

          {note != null ? (
            <Text
              className="font-inter text-muted mt-1.5 pl-12 text-[11.5px] italic"
              numberOfLines={2}
            >
              {note}
            </Text>
          ) : null}
        </Animated.View>
      </PressableFeedback>
    </SwipeableRow>
  );
}
```

---

## Task 7: Copy screens tree (Wave C, part 2 — detail/ subdirectory)

**Files:**
- Create: all files in `modules/transactions/screens/transactions/detail/`

- [ ] **Step 1: Copy `detail/detail.anim.ts`, `detail/detail.helpers.ts`, `detail/detail.hook.ts`, `detail/detail.state.ts`, `detail/detail.store.ts` verbatim**

Check each for `@/store/transaction.store`, `@/database/entities/transaction.entity` or `@/database/transactions` imports and replace with module-relative paths:
- `@/store/transaction.store` → `@/modules/transactions/store/transaction.store`
- `@/database/entities/transaction.entity` → `@/modules/transactions/entities/transaction.entity`
- `@/database/transactions` → `@/modules/transactions/database/transactions`

```bash
grep -rn "@/store/transaction.store\|@/database/entities/transaction\|@/database/transactions" \
  /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/screens/transactions/detail/
```

Copy all `.ts` files, substituting those imports.

- [ ] **Step 2: Copy `detail/index.tsx` — update import paths**

Check for the same old absolute paths and replace them. The `Transaction` type import likely comes from `@/database/entities/transaction.entity` — replace with `@/modules/transactions/entities/transaction.entity`.

```bash
grep -n "@/store/transaction.store\|@/database/entities/transaction\|@/database/transactions" \
  /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/screens/transactions/detail/index.tsx
```

- [ ] **Step 3: Copy `detail/components/action_row.tsx`, `detail/components/delete_confirm_dialog.tsx`, `detail/components/detail_hero.tsx`, `detail/components/detail_row.tsx`, `detail/components/detail_rows_card.tsx`, `detail/components/not_found_state.tsx`, `detail/components/note_card.tsx` — check and copy**

Run for each file:
```bash
grep -n "Pressable\|@/store/transaction.store\|@/database/entities/transaction\|@/database/transactions" \
  /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/screens/transactions/detail/components/<filename>
```

For any `Pressable` without `onPressIn`/`onPressOut`: replace with `PressableFeedback`. For any old absolute imports: replace as above.

- [ ] **Step 4: Copy `detail/components/transfer_flow_card.tsx` — 1× Pressable → PressableFeedback**

The `Pressable` in `Cell` is conditional (`if (onPress)`) and uses only `onPress`. Replace with `PressableFeedback`. The `inner` variable remains a `View` element; the `PressableFeedback` wraps it when `onPress` is set.

```typescript
// modules/transactions/screens/transactions/detail/components/transfer_flow_card.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';

import { getAccountTypeIcon } from '../detail.helpers';

interface Props {
  fromAccount: Account;
  toAccount: Account;
  fromAmount: number;
  fromCurrency: Currency;
  toAmount: number;
  toCurrency: Currency;
  onPressFrom?: () => void;
  onPressTo?: () => void;
}

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

function Cell({
  label,
  account,
  amount,
  currency,
  signPrefix,
  onPress,
}: {
  label: string;
  account: Account;
  amount: number;
  currency: Currency;
  signPrefix: '+' | '−';
  onPress?: () => void;
}): React.ReactElement {
  const inner = (
    <View className="flex-1 items-center">
      <Text className="font-inter text-foreground/55 text-[9.5px] font-semibold tracking-wide uppercase">
        {label}
      </Text>
      <View className="bg-accent/15 mt-1.5 h-9 w-9 items-center justify-center rounded-lg">
        <MaterialCommunityIcons
          name={getAccountTypeIcon(account.type)}
          size={16}
          color={GoldTokens[500]}
        />
      </View>
      <Text className="font-inter text-foreground mt-1 text-[11.5px] font-semibold">
        {account.name}
      </Text>
      <Text className="font-sora text-foreground/85 mt-0.5 text-[11px] font-semibold">
        {signPrefix}
        {numberFmt.format(amount)} {currency}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <PressableFeedback
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${account.name}, open account detail`}
        className="flex-1"
      >
        {inner}
      </PressableFeedback>
    );
  }
  return inner;
}

export function TransferFlowCard({
  fromAccount,
  toAccount,
  fromAmount,
  fromCurrency,
  toAmount,
  toCurrency,
  onPressFrom,
  onPressTo,
}: Props): React.ReactElement {
  return (
    <Card
      className="border-accent/18 mx-4 mt-4 flex-row items-center gap-2 rounded-2xl border p-3.5"
      style={{ elevation: 0, shadowOpacity: 0 }}
    >
      <Cell
        label={Strings.detailFlowFromLabel}
        account={fromAccount}
        amount={fromAmount}
        currency={fromCurrency}
        signPrefix="−"
        onPress={onPressFrom}
      />
      <MaterialCommunityIcons name="arrow-right" size={20} color={GoldTokens[500]} />
      <Cell
        label={Strings.detailFlowToLabel}
        account={toAccount}
        amount={toAmount}
        currency={toCurrency}
        signPrefix="+"
        onPress={onPressTo}
      />
    </Card>
  );
}
```

---

## Task 8: Copy screens tree (Wave C, part 3 — filter/ subdirectory)

**Files:**
- Create: all files in `modules/transactions/screens/transactions/filter/`

- [ ] **Step 1: Copy `filter/filter.helpers.ts`, `filter/filter.hook.ts`, `filter/filter.state.ts`, `filter/filter.store.ts` — check for old imports**

```bash
grep -rn "@/store/transaction.store\|@/database/entities/transaction\|@/database/transactions" \
  /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/screens/transactions/filter/
```

Copy each file, replacing any found imports with module-relative equivalents.

- [ ] **Step 2: Copy `filter/index.tsx` — 1× Pressable → PressableFeedback**

Replace the reset-link `Pressable` with `PressableFeedback`. Keep everything else verbatim.

```typescript
// modules/transactions/screens/transactions/filter/index.tsx
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

import { AccountAccordion } from './components/account_accordion';
import { AmountAccordion } from './components/amount_accordion';
import { CategoryAccordion } from './components/category_accordion';
import { useFilterSheet } from './filter.hook';

export function FilterSheet(): React.ReactElement {
  const f = useFilterSheet();

  return (
    <Sheet
      isOpen={f.state.visible}
      onOpenChange={(open) => {
        if (!open) f.close();
      }}
      snapPoints={['45%', '92%']}
      scrollable
      title={Strings.filterTitle}
      footer={
        <Button
          variant="primary"
          label={
            f.state.draftCount > 0
              ? Strings.filterApplyWithCount(f.state.draftCount)
              : Strings.filterApply
          }
          onPress={f.applyDraft}
          disabled={f.state.draftCount === 0}
        />
      }
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}
      >
        <PressableFeedback
          onPress={f.resetDraft}
          accessibilityRole="button"
          accessibilityLabel="Reset filters"
        >
          <Text className="font-inter text-accent text-[12px] font-semibold">
            {Strings.filterReset}
          </Text>
        </PressableFeedback>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SHEET_FOOTER_CLEARANCE }}
      >
        <AccountAccordion
          accounts={f.state.accounts}
          selectedIds={f.state.draft.accountIds}
          expanded={f.state.openSection === 'accounts'}
          onToggleSection={() => f.toggleSection('accounts')}
          onToggleId={f.toggleAccountId}
        />
        <CategoryAccordion
          categories={f.state.categories}
          selectedIds={f.state.draft.categoryIds}
          expanded={f.state.openSection === 'categories'}
          onToggleSection={() => f.toggleSection('categories')}
          onToggleId={f.toggleCategoryId}
        />
        <AmountAccordion
          draft={f.state.draft}
          expanded={f.state.openSection === 'amount'}
          onToggleSection={() => f.toggleSection('amount')}
          onChangeCurrency={f.setAmountCurrency}
          onChangeMin={f.setAmountMin}
          onChangeMax={f.setAmountMax}
        />
      </BottomSheetScrollView>
    </Sheet>
  );
}
```

- [ ] **Step 3: Copy `filter/components/account_accordion.tsx`, `filter/components/category_accordion.tsx`, `filter/components/amount_accordion.tsx` — check for Pressables and old imports**

```bash
grep -rn "Pressable\|@/store/transaction.store\|@/database/entities/transaction" \
  /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/screens/transactions/filter/components/
```

Replace any `Pressable` (functional-only) with `PressableFeedback`. Replace old imports.

---

## Task 9: Copy screens tree (Wave C, part 4 — transaction_form/ subdirectory)

**Files:**
- Create: all files in `modules/transactions/screens/transactions/transaction_form/`

- [ ] **Step 1: Copy `transaction_form/add_transaction.hook.ts`, `transaction_form/add_transaction.state.ts`, `transaction_form/add_transaction.store.ts`, `transaction_form/edit_transaction.helpers.ts`, `transaction_form/edit_transaction.hook.ts`, `transaction_form/edit_transaction.state.ts`, `transaction_form/edit_transaction.store.ts`, `transaction_form/transaction_form_body.state.ts` — check and replace old imports**

```bash
grep -rn "@/store/transaction.store\|@/database/entities/transaction\|@/database/transactions\|@/repositories/transaction" \
  /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/screens/transactions/transaction_form/ \
  --include="*.ts"
```

For each match, replace with the module-relative equivalent:
- `@/store/transaction.store` → `@/modules/transactions/store/transaction.store`
- `@/database/entities/transaction.entity` → `@/modules/transactions/entities/transaction.entity`
- `@/database/transactions` → `@/modules/transactions/database/transactions`
- `@/repositories/transaction.repository` → `@/modules/transactions/repositories/transaction.repository`

- [ ] **Step 2: Copy `transaction_form/components/amount_hero.tsx`, `transaction_form/components/no_accounts_empty.tsx` — copy verbatim (no transaction-module imports)**

- [ ] **Step 3: Copy `transaction_form/components/date_row.tsx` — 1× Pressable → PressableFeedback**

Replace the date-trigger `Pressable`. It uses only `onPress` and `testID`.

```typescript
// modules/transactions/screens/transactions/transaction_form/components/date_row.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { PressableFeedback } from 'heroui-native';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import { formatLongDate } from '@/utils/format_date';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function DateRow({ value, onChange }: Props): React.ReactElement {
  const [showPicker, setShowPicker] = useState(false);
  const dateAsDate = new Date(`${value}T12:00:00`);
  const formatted = formatLongDate(value);
  const maximumDate = new Date();

  const handlePress = () => setShowPicker(true);

  const handleAndroidChange = (event: DateTimePickerEvent, d?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && d) onChange(toISODate(d));
  };

  const handleIosChange = (_event: DateTimePickerEvent, d?: Date) => {
    if (d) onChange(toISODate(d));
  };

  return (
    <View className="mt-3">
      <PressableFeedback
        testID="date-row"
        onPress={handlePress}
        className="bg-default rounded-md px-3 py-3"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View>
          <Text className="font-inter text-muted text-[11px]">{Strings.addTxDateLabel}</Text>
          <Text className="font-sora text-foreground text-[15px] font-semibold">{formatted}</Text>
        </View>
        <MaterialCommunityIcons name="calendar" size={18} color={CoreTokens.text2} />
      </PressableFeedback>

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          testID="date-picker-android"
          value={dateAsDate}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' && showPicker ? (
        <DateTimePicker
          testID="date-picker-ios"
          value={dateAsDate}
          mode="date"
          display="spinner"
          themeVariant="dark"
          maximumDate={maximumDate}
          onChange={handleIosChange}
        />
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Copy `transaction_form/components/exchange_rate_row.tsx` — 2× Pressable → PressableFeedback**

Two Pressables: the outer toggle trigger and the inner reset link. Replace both. The outer Pressable has `style={{ flexDirection: 'row', … }}` which is passed as `style` prop to PressableFeedback (it accepts `style`).

```typescript
// modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx
import { Input, PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { roundMoney } from '@/utils/money';

const STALE_THRESHOLD_DAYS = 30;

function isStale(rateUpdatedAt: string | null): boolean {
  if (!rateUpdatedAt) return false;
  const updated = new Date(rateUpdatedAt).getTime();
  if (isNaN(updated)) return false;
  const ageMs = Date.now() - updated;
  return ageMs > STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

function formatPreviewAmount(amount: number, rateStr: string): string {
  const rate = parseFloat(rateStr);
  if (isNaN(rate) || rate <= 0) return '—';
  const egp = roundMoney(amount * rate);
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(egp);
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  overrideEnabled: boolean;
  onToggleOverride: () => void;
  rateUpdatedAt: string | null;
  amount: number;
  error?: string;
}

export function ExchangeRateRow({
  value,
  onChange,
  overrideEnabled,
  onToggleOverride,
  rateUpdatedAt,
  amount,
  error,
}: Props): React.ReactElement {
  const stale = isStale(rateUpdatedAt);

  const subtitle = overrideEnabled
    ? Strings.addTxRateSourceCustom
    : rateUpdatedAt
      ? `${Strings.addTxRateSourceStored} · ${Strings.addTxRateLastUpdated.replace('{date}', formatDateShort(rateUpdatedAt))}`
      : Strings.addTxRateSourceStored;

  return (
    <View className="border-accent/30 bg-accent/10 mt-3 rounded-md border px-3 py-3">
      <PressableFeedback
        testID="exchange-rate-row"
        onPress={() => {
          if (!overrideEnabled) onToggleOverride();
        }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sora text-foreground text-[14px] font-semibold">
            {Strings.currencyRateLabel}
          </Text>
          <Text className="font-inter text-muted mt-0.5 text-[11px]">{subtitle}</Text>
          {stale ? (
            <Text className="font-inter text-warning mt-0.5 text-[11px]">
              {Strings.addTxRateStale}
            </Text>
          ) : null}
        </View>
        {overrideEnabled ? (
          <View style={{ width: 100 }}>
            <Input
              testID="exchange-rate-input"
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
        ) : (
          <Text className="font-sora text-foreground text-[15px] font-semibold">{value}</Text>
        )}
      </PressableFeedback>

      <Text className="font-inter text-muted mt-2 text-[12px]">
        {Strings.addTxEgpPreview.replace('{amount}', formatPreviewAmount(amount, value))}
      </Text>

      {overrideEnabled ? (
        <PressableFeedback onPress={onToggleOverride} className="mt-2 self-end">
          <Text className="font-inter text-accent text-[12px]">{Strings.addTxRateReset}</Text>
        </PressableFeedback>
      ) : null}

      {error ? <Text className="font-inter text-danger mt-1 text-[11px]">{error}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 5: Copy `transaction_form/components/type_tabs.tsx` — 1× Pressable → PressableFeedback**

`disabled` prop maps to `isDisabled`. `style={{ position: 'relative' }}` passes through on `PressableFeedback` as a `style` prop.

```typescript
// modules/transactions/screens/transactions/transaction_form/components/type_tabs.tsx
import { PressableFeedback } from 'heroui-native';
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from '@/components/ui/text';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

const label = tv({
  base: 'font-inter text-[13px]',
  variants: {
    active: { true: 'font-semibold', false: 'font-medium text-muted' },
    type: {
      expense: '',
      income: '',
      transfer: '',
      cc_payment: '',
    },
  },
  compoundVariants: [
    { active: true, type: 'expense', class: 'text-danger' },
    { active: true, type: 'income', class: 'text-success' },
    { active: true, type: 'transfer', class: 'text-info' },
    { active: true, type: 'cc_payment', class: 'text-accent-cc' },
  ],
});

const indicator = tv({
  variants: {
    type: {
      expense: 'bg-danger text-danger',
      income: 'bg-success text-success',
      transfer: 'bg-info text-info',
      cc_payment: 'bg-accent-cc text-accent-cc',
    },
  },
});

const TABS: Array<{ type: TransactionType; label: string }> = [
  { type: TransactionType.Expense, label: Strings.addTxTypeExpense },
  { type: TransactionType.Income, label: Strings.addTxTypeIncome },
  { type: TransactionType.Transfer, label: Strings.addTxTypeTransfer },
  { type: TransactionType.CCPayment, label: Strings.addTxTypeCCPayment },
];

interface Props {
  active: TransactionType;
  onSelect: (t: TransactionType) => void;
  disabled: boolean;
}

export function TypeTabs({ active, onSelect, disabled }: Props): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row' }} className="border-separator border-b">
      {TABS.map(({ type, label: lbl }) => {
        const isActive = type === active;
        return (
          <PressableFeedback
            key={type}
            testID={`type-tab-${type}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled }}
            isDisabled={disabled}
            onPress={() => onSelect(type)}
            style={{ position: 'relative' }}
            className="flex-1 items-center justify-center py-3"
          >
            <Text className={label({ active: isActive, type })}>{lbl}</Text>
            {isActive ? (
              <View
                testID={`type-tab-indicator-${type}`}
                style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2 }}
                className={indicator({ type })}
              />
            ) : null}
          </PressableFeedback>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 6: Copy `transaction_form/transaction_form_body.tsx` — 3× Pressable → PressableFeedback + TextInput → Input**

Key changes:
1. Replace `import { Pressable, TextInput, View } from 'react-native'` with `import { View } from 'react-native'`
2. Add `import { Input, PressableFeedback } from 'heroui-native'`
3. Replace all three `<Pressable` with `<PressableFeedback` and close tags accordingly
4. Change `disabled={locked}` to `isDisabled={locked}` on the two lockable rows (from-account and to-account)
5. Replace `<TextInput ... className="font-inter text-foreground p-0 text-[14px]" />` with `<Input value={note} onChangeText={setNote} placeholder={Strings.addTxNotePlaceholder} placeholderTextColor={CoreTokens.text2} className="font-inter text-foreground p-0 text-[14px]" />`

```typescript
// modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Input, PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { TYPE_OPTIONS } from '@/components/account_type_pill';
import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

import { AmountHero } from './components/amount_hero';
import { DateRow } from './components/date_row';
import { ExchangeRateRow } from './components/exchange_rate_row';
import { TypeTabs } from './components/type_tabs';

interface Props {
  visible: boolean;
  locked: boolean;
  type: TransactionType;
  onSelectType: (t: TransactionType) => void;
  amountStr: string;
  setAmountStr: (v: string) => void;
  handleNumpad?: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
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
  rateOverride: boolean;
  toggleRateOverride: () => void;
  rateUpdatedAt: string | null;
  rateError?: string;
  date: string;
  setDate: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  currency: Currency;
}

export function TransactionFormBody(props: Props): React.ReactElement {
  const {
    visible,
    locked,
    type,
    onSelectType,
    amountStr,
    setAmountStr,
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
    rateOverride,
    toggleRateOverride,
    rateUpdatedAt,
    rateError,
    date,
    setDate,
    note,
    setNote,
    currency,
  } = props;

  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const amountNum = parseFloat(amountStr) || 0;

  return (
    <View style={{ flex: 1 }}>
      <TypeTabs active={type} onSelect={onSelectType} disabled={locked} />

      <AmountHero
        visible={visible}
        amountStr={amountStr}
        onChange={setAmountStr}
        type={type}
        currency={currency}
      />
      {amountError ? (
        <Text className="font-inter text-danger mt-1 text-center text-[11px]">{amountError}</Text>
      ) : null}

      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* From account */}
        <PressableFeedback
          testID="from-account-row"
          onPress={locked ? undefined : onOpenAccountPicker}
          isDisabled={locked}
          className="bg-default rounded-md px-3 py-3"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-muted text-[11px]">
              {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {selectedAccount ? (
                <MaterialCommunityIcons
                  name={TYPE_OPTIONS.find((o) => o.type === selectedAccount.type)?.icon ?? 'bank'}
                  size={ms(16)}
                  color={selectedAccount.color ?? CoreTokens.text2}
                />
              ) : null}
              <Text className="font-sora text-foreground text-[15px] font-semibold">
                {selectedAccount?.name ?? Strings.addTxPickAccountTitle}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name={locked ? 'lock-outline' : 'chevron-right'}
            size={18}
            color={CoreTokens.text2}
          />
        </PressableFeedback>
        {accountError ? (
          <Text className="font-inter text-danger text-[11px]">{accountError}</Text>
        ) : null}

        {/* To account */}
        {isTransferOrCC ? (
          <>
            <PressableFeedback
              testID="to-account-row"
              onPress={locked ? undefined : onOpenToPicker}
              isDisabled={locked}
              className="bg-default rounded-md px-3 py-3"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <Text className="font-inter text-muted text-[11px]">{Strings.addTxToLabel}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {selectedToAccount ? (
                    <MaterialCommunityIcons
                      name={
                        TYPE_OPTIONS.find((o) => o.type === selectedToAccount.type)?.icon ?? 'bank'
                      }
                      size={ms(16)}
                      color={selectedToAccount.color ?? CoreTokens.text2}
                    />
                  ) : null}
                  <Text className="font-sora text-foreground text-[15px] font-semibold">
                    {selectedToAccount?.name ?? Strings.addTxPickToTitle}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={locked ? 'lock-outline' : 'chevron-right'}
                size={18}
                color={CoreTokens.text2}
              />
            </PressableFeedback>
            {toAccountError ? (
              <Text className="font-inter text-danger text-[11px]">{toAccountError}</Text>
            ) : null}
          </>
        ) : null}

        {/* Category (expense/income only) */}
        {!isTransferOrCC ? (
          <>
            <PressableFeedback
              testID="category-row"
              onPress={onOpenCategoryPicker}
              className="bg-default rounded-md px-3 py-3"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <Text className="font-inter text-muted text-[11px]">
                  {Strings.addTxCategoryLabel}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(6) }}>
                  {selectedCategory ? (
                    <MaterialCommunityIcons
                      name={toIconName(selectedCategory.icon, 'tag')}
                      size={ms(15)}
                      // oxlint-disable-next-line typescript/no-unnecessary-condition -- category color can be null despite the string type
                      color={selectedCategory.color ?? CoreTokens.text1}
                    />
                  ) : null}
                  <Text className="font-sora text-foreground text-[15px] font-semibold">
                    {selectedCategory?.name ?? Strings.addTxPickCategoryTitle}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={CoreTokens.text2} />
            </PressableFeedback>
            {categoryError ? (
              <Text className="font-inter text-danger text-[11px]">{categoryError}</Text>
            ) : null}
          </>
        ) : null}

        {isUSD ? (
          <ExchangeRateRow
            value={exchangeRate}
            onChange={setExchangeRate}
            overrideEnabled={rateOverride}
            onToggleOverride={toggleRateOverride}
            rateUpdatedAt={rateUpdatedAt}
            amount={amountNum}
            error={rateError}
          />
        ) : null}

        <DateRow value={date} onChange={setDate} />

        {/* Note */}
        <View className="bg-default rounded-md px-3 py-3">
          <Text className="font-inter text-muted text-[11px]">{Strings.addTxNoteLabel}</Text>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder={Strings.addTxNotePlaceholder}
            placeholderTextColor={CoreTokens.text2}
            className="font-inter text-foreground p-0 text-[14px]"
          />
        </View>
      </BottomSheetScrollView>
    </View>
  );
}
```

- [ ] **Step 7: Copy `transaction_form/index.tsx` — update AccountPickerSheet import**

The file currently imports from `@/components/sheets/account_picker_sheet`. Since this file now lives inside `modules/transactions/`, import from `@/modules/accounts` barrel instead.

Change:
```
import { AccountPickerSheet } from '@/components/sheets/account_picker_sheet';
```
to:
```
import { AccountPickerSheet } from '@/modules/accounts';
```

Also update `@/database/entities/transaction.entity` → `@/modules/transactions/entities/transaction.entity` if present.

Copy the rest verbatim (internal relative imports like `./add_transaction.hook`, `./components/no_accounts_empty`, etc. remain valid).

- [ ] **Step 8: Copy `screens/transactions/index.tsx` — update self-referencing imports**

The main screen index imports from within the screens tree using `@/screens/transactions/…` paths. In the new location those are all relative and will need updating to the module-relative form.

Replace:
- `from '@/screens/transactions/transaction_form'` → `from './transaction_form'`
- `from '@/screens/transactions/transaction_form/add_transaction.state'` → `from './transaction_form/add_transaction.state'`
- `from '@/screens/transactions/transaction_form/add_transaction.store'` → `from './transaction_form/add_transaction.store'`
- `from '@/screens/transactions/transaction_form/edit_transaction.state'` → `from './transaction_form/edit_transaction.state'`
- `from '@/screens/transactions/transaction_form/edit_transaction.store'` → `from './transaction_form/edit_transaction.store'`
- `from '@/store/transaction.store'` → `from '@/modules/transactions/store/transaction.store'`
- `from '@/screens/transactions/filter/filter.state'` → `from './filter/filter.state'`

Copy the default export; the route file at `app/(app)/(tabs)/transactions/index.tsx` currently exports `screens/transactions` default — it will be updated in Wave D to point here.

- [ ] **Step 9: Run typecheck to verify Wave C is clean**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm run typecheck 2>&1 | tail -20
```

Expected: zero new errors beyond baseline. The original `screens/transactions/` tree is still present and intact at this point, so there should be no missing imports.

- [ ] **Step 10: Commit Wave C**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add modules/transactions/screens/ && git commit -m "refactor(transactions): Wave C — screens tree into modules/transactions/screens/ with HeroUI fixes"
```

---

## Task 10: Wave D — Delete originals, create stubs, update routes

**Files:**
- Delete: `screens/transactions/` (entire tree)
- Delete: `repositories/transaction.repository.ts`
- Modify: `store/transaction.store.ts` (replace with stub)
- Modify: `database/entities/transaction.entity.ts` (replace with stub)
- Modify: `database/transactions.ts` (replace with stub)
- Modify: `app/(app)/(tabs)/transactions/index.tsx`
- Modify: `app/(app)/(tabs)/transactions/detail/[id]/index.tsx`

- [ ] **Step 1: Delete the original screens tree and repository**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && rm -rf screens/transactions/ repositories/transaction.repository.ts
```

- [ ] **Step 2: Write backward-compat stub for `store/transaction.store.ts`**

```typescript
// store/transaction.store.ts
// backward-compat re-export — remove when all consumers are migrated to @/modules/transactions
export {
  createTransactionStore,
  useTransactionStore,
  PAGE_SIZE,
} from '@/modules/transactions/store/transaction.store';
export type {
  Transaction,
  NewTransactionInput,
  TransactionListQuery,
  UpdateTransactionInput,
  TransactionListFilters,
} from '@/modules/transactions/store/transaction.store';
```

- [ ] **Step 3: Write backward-compat stub for `database/entities/transaction.entity.ts`**

```typescript
// database/entities/transaction.entity.ts
// backward-compat re-export — remove when all consumers are migrated to @/modules/transactions
export type { Transaction } from '@/modules/transactions/entities/transaction.entity';
```

- [ ] **Step 4: Write backward-compat stub for `database/transactions.ts`**

```typescript
// database/transactions.ts
// backward-compat re-export — remove when all consumers are migrated to @/modules/transactions
export type {
  MonthExpenseStats,
  TransactionListQuery,
  UpdateTransactionInput,
  PeriodTotals,
} from '@/modules/transactions/database/transactions';
export {
  getMonthExpenseStats,
  addTransaction,
  getTransactions,
  getTransactionsByAccount,
  getTransactionById,
  deleteTransaction,
  getPeriodTotals,
  updateTransaction,
} from '@/modules/transactions/database/transactions';
```

- [ ] **Step 5: Update `app/(app)/(tabs)/transactions/index.tsx`**

```typescript
export { default } from '@/modules/transactions/screens/transactions';
```

- [ ] **Step 6: Update `app/(app)/(tabs)/transactions/detail/[id]/index.tsx`**

```typescript
export { default } from '@/modules/transactions/screens/transactions/detail';
```

- [ ] **Step 7: Run typecheck to verify everything still resolves**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm run typecheck 2>&1 | tail -20
```

Expected: zero errors. The stubs re-export everything that external callers (commitments, budget, etc.) relied on.

- [ ] **Step 8: Run tests to confirm nothing is broken**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm test -- --ci 2>&1 | tail -30
```

Expected: All tests pass or fail for the same reasons they failed before (import paths in tests still point to old locations — that is expected and will be fixed in Task 11).

- [ ] **Step 9: Commit Wave D**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add -A && git commit -m "refactor(transactions): Wave D — delete originals, write backward-compat stubs, update routes"
```

---

## Task 11: Update test import paths

**Files:**
- Modify: all `__tests__/` files that import from old transaction paths

- [ ] **Step 1: Identify all imports needing updates**

```bash
grep -rn "@/store/transaction.store\|@/repositories/transaction.repository\|@/database/transactions\|@/database/entities/transaction\|@/screens/transactions" \
  /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/__tests__/ \
  --include="*.ts"
```

- [ ] **Step 2: Update `__tests__/transaction.store.test.ts`**

Replace:
- `from '@/database/entities/transaction.entity'` → `from '@/modules/transactions/entities/transaction.entity'`
- `from '@/repositories/transaction.repository'` → `from '@/modules/transactions/repositories/transaction.repository'`
- `from '@/store/transaction.store'` → `from '@/modules/transactions/store/transaction.store'`

- [ ] **Step 3: Update `__tests__/transaction.repository.test.ts`**

Replace:
- `from '@/database/migrations'` → unchanged (migrations live in `database/migrations/`, not being moved)
- `from '@/database/transactions'` → `from '@/modules/transactions/database/transactions'`
- `from '@/repositories/transaction.repository'` → `from '@/modules/transactions/repositories/transaction.repository'`

- [ ] **Step 4: Update `__tests__/transaction.query_executor.test.ts`, `__tests__/transaction.migration.test.ts`, `__tests__/transactions_get_period_totals.test.ts`, `__tests__/database_get_transactions_filter.test.ts`, `__tests__/update_transaction.query_executor.test.ts`**

For each, run:
```bash
grep -n "import" /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/__tests__/<filename>
```

Replace:
- `from '@/database/transactions'` → `from '@/modules/transactions/database/transactions'`
- `from '@/database/entities/transaction.entity'` → `from '@/modules/transactions/entities/transaction.entity'`

- [ ] **Step 5: Update `__tests__/add_transaction.store.test.ts`, `__tests__/edit_transaction.store.test.ts`**

Replace:
- `from '@/store/transaction.store'` → `from '@/modules/transactions/store/transaction.store'`
- `from '@/repositories/transaction.repository'` → `from '@/modules/transactions/repositories/transaction.repository'`

- [ ] **Step 6: Update `__tests__/format_transaction_title.test.ts`, `__tests__/group_transactions_by_date.test.ts`**

Read each, replace any `@/database/entities/transaction.entity` → `@/modules/transactions/entities/transaction.entity`.

- [ ] **Step 7: Update `__tests__/screens/transactions/transactions_helpers.test.ts`, `__tests__/screens/transactions/transactions_state.test.ts`, `__tests__/screens/transactions/transactions_store.test.ts`**

Replace:
- `from '@/screens/transactions/…'` → `from '@/modules/transactions/screens/transactions/…'`
- `from '@/store/transaction.store'` → `from '@/modules/transactions/store/transaction.store'`

- [ ] **Step 8: Update `__tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts`, `add_transaction_state.test.ts`, `edit_transaction.hook.test.ts`, `edit_transaction_state.test.ts`, `transaction_form_body_state.test.ts`**

Replace:
- `from '@/screens/transactions/transaction_form/…'` → `from '@/modules/transactions/screens/transactions/transaction_form/…'`
- `from '@/store/transaction.store'` → `from '@/modules/transactions/store/transaction.store'`

- [ ] **Step 9: Update `__tests__/screens/transactions/detail/detail_helpers.test.ts`, `detail_state.test.ts`, `detail_store.test.ts`**

Replace:
- `from '@/screens/transactions/detail/…'` → `from '@/modules/transactions/screens/transactions/detail/…'`
- `from '@/database/entities/transaction.entity'` → `from '@/modules/transactions/entities/transaction.entity'`

- [ ] **Step 10: Update `__tests__/screens/transactions/filter/filter_state.test.ts`, `filter_store.test.ts`**

Replace:
- `from '@/screens/transactions/filter/…'` → `from '@/modules/transactions/screens/transactions/filter/…'`

- [ ] **Step 11: Run full test suite**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm test -- --ci 2>&1 | tail -30
```

Expected: all tests pass with the same pass/fail ratio as before this migration (no logic changes were made).

- [ ] **Step 12: Run full CI parity check**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm run format:check && npm run lint && npm run typecheck && npm test -- --ci && npx --yes expo-doctor && npx expo prebuild --no-install --platform android && test -d android && echo "✓ CI parity green — safe to push"
```

Expected: `✓ CI parity green — safe to push`

- [ ] **Step 13: Commit test updates**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add __tests__/ && git commit -m "test(transactions): update import paths to modules/transactions/"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Wave A: entity, database queries, repository, store all created with updated relative imports
- [x] Wave B: public barrel created with store + types exported
- [x] Wave C: all 40+ screen files mapped; all 10 HeroUI Pressable→PressableFeedback locations addressed; TextInput→Input in transaction_form_body.tsx
- [x] Wave D: originals deleted; backward-compat stubs at all 3 old database/store paths; routes updated; `components/sheets/account_picker_sheet.tsx` left untouched (commitments dependency)
- [x] Test files: all 20 test files listed in spec covered in Task 11
- [x] `transaction_row.tsx` double-scale issue handled: `animation={false}` on PressableFeedback to prevent conflict with manual Reanimated scale
- [x] `transaction_form/index.tsx` AccountPickerSheet import updated to `@/modules/accounts` barrel
- [x] Commitments consumers of `components/sheets/account_picker_sheet.tsx` protected (stub not deleted)

**Type consistency:**
- [x] `Transaction` type flows: entity → database → repository → store → barrel; consistent names throughout
- [x] `ITransactionRepository`, `NewTransactionInput`, `TransactionListQuery`, `UpdateTransactionInput` all defined in repository and re-exported from store and barrel
- [x] `TransactionListFilters` defined in store and exported from barrel
- [x] `PAGE_SIZE` exported from store and barrel
- [x] `PeriodTotals`, `MonthExpenseStats` defined in database file and re-exported in stub
- [x] `disabled` → `isDisabled` mapping applied to all three PressableFeedback replacements in transaction_form_body.tsx and type_tabs.tsx

**Placeholder scan:** No TBD, TODO, or placeholder text found. All code blocks are complete and self-contained.
