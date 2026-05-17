import type { SQLiteDatabase } from 'expo-sqlite';

import type { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from './entities/transaction.entity';

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

    if (tx.type === 'expense') {
      // Debit FROM account by native face-value amount.
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
    } else if (tx.type === 'income') {
      // Credit FROM account by native face-value amount.
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
    } else if (tx.type === 'transfer') {
      // FROM account loses native amount; TO account gains its native equivalent.
      // Fall back to egp_amount for legacy rows where to_amount was not yet populated.
      const transferToAmt = tx.to_amount ?? tx.egp_amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [transferToAmt, now, tx.to_account_id],
      );
    } else if (tx.type === 'cc_payment') {
      // Debit source asset account by its native currency amount.
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
      // Credit CC account using to_amount (CC-native, always EGP).
      // Installment-first split uses minimum_payment_snapshot captured at save time.
      const [cc] = await db.getAllAsync<{ revolving_balance: number | null }>(
        'SELECT revolving_balance FROM accounts WHERE id = ?',
        [tx.to_account_id],
      );
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
  // Escape SQL LIKE wildcards so user input can't act as a wildcard.
  // \ is the escape char declared by the ESCAPE clause below.
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
  if (!tx) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);

    const now = new Date().toISOString();

    if (tx.type === 'expense') {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
    } else if (tx.type === 'income') {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
    } else if (tx.type === 'transfer') {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
      const toAmt = tx.to_amount ?? tx.egp_amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [toAmt, now, tx.to_account_id],
      );
    } else if (tx.type === 'cc_payment') {
      // Restore asset account.
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.amount, now, tx.account_id],
      );
      // Restore CC account using stored snapshot — immune to later minimum_payment changes.
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
  if (!existing) return;

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (existing.type === 'expense') {
      // Delta in the account's native currency.
      const delta = updates.amount - existing.amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.account_id],
      );
    } else if (existing.type === 'income') {
      const delta = updates.amount - existing.amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.account_id],
      );
    } else if (existing.type === 'transfer') {
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
    } else if (existing.type === 'cc_payment') {
      // Simple delta math is incorrect for CC because installment-first split is non-linear.
      // Strategy: reverse old payment using snapshot, then apply new payment using current CC state.

      // --- Reverse old payment ---
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

      // --- Apply new payment ---
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
      const newRevolving = ccForApply?.revolving_balance ?? 0;
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

    // Snapshot the new minimum_payment for cc_payment updates so future reversals stay accurate.
    let newMinPaymentSnapshot: number | null = null;
    if (existing.type === 'cc_payment') {
      const [ccSnap] = await db.getAllAsync<{ minimum_payment: number | null }>(
        'SELECT minimum_payment FROM accounts WHERE id = ?',
        [existing.to_account_id],
      );
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
