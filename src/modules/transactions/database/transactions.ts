// modules/transactions/database/transactions.ts
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Currency } from '@/constants/enums';
import { TransactionType } from '@/constants/enums';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

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
 * Card credits subtract from spend and remain included in the contributing row count.
 * Transfers, cash income, and CC payments are excluded.
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
       COALESCE(SUM(CASE
         WHEN transaction_row.type = 'expense' THEN transaction_row.egp_amount
         ELSE -transaction_row.egp_amount
       END), 0) AS total,
       COALESCE(SUM(CASE
         WHEN transaction_row.currency = 'EGP' AND transaction_row.type = 'expense'
           THEN transaction_row.amount
         WHEN transaction_row.currency = 'EGP' THEN -transaction_row.amount
         ELSE 0
       END), 0) AS egp_native,
       COALESCE(SUM(CASE
         WHEN transaction_row.currency = 'USD' AND transaction_row.type = 'expense'
           THEN transaction_row.amount
         WHEN transaction_row.currency = 'USD' THEN -transaction_row.amount
         ELSE 0
       END), 0) AS usd_native,
       COUNT(*) AS cnt
     FROM transactions transaction_row
     JOIN accounts account_row ON account_row.id = transaction_row.account_id
     WHERE (
         transaction_row.type = 'expense'
         OR (transaction_row.type = 'income' AND account_row.type = 'credit_card')
       )
       AND transaction_row.transaction_date >= ?
       AND transaction_row.transaction_date < ?`,
    [monthStart, nextMonthStart],
  );
  return {
    totalEgp: row?.total ?? 0,
    egpNative: row?.egp_native ?? 0,
    usdNative: row?.usd_native ?? 0,
    count: row?.cnt ?? 0,
  };
}

export async function insertTransactionRow(db: SQLiteDatabase, tx: Transaction): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO transactions (
      id, type, amount, currency, egp_amount, exchange_rate,
      to_amount, minimum_payment_snapshot, revolving_balance_delta,
      account_id, to_account_id, category_id, budget_id, note,
      transaction_date, transaction_time, commitment_payment_id,
      installment_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id,
      tx.type,
      tx.amount,
      tx.currency,
      tx.egp_amount,
      tx.exchange_rate,
      tx.to_amount,
      tx.minimum_payment_snapshot,
      tx.revolving_balance_delta,
      tx.account_id,
      tx.to_account_id,
      tx.category_id,
      tx.budget_id,
      tx.note,
      tx.transaction_date,
      tx.transaction_time,
      tx.commitment_payment_id,
      tx.installment_id,
      tx.created_at,
      tx.updated_at,
    ],
  );
  return result.changes;
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
const TRANSACTION_LIST_ORDER = `transaction_date DESC,
  transaction_time DESC,
  created_at DESC,
  id DESC`;

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
  const numericSearch =
    searchParam !== null ? (parseNonNegativeDecimal(searchParam) ?? null) : null;

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
    WITH search_input(search_text, pattern, numeric_amount) AS (
      SELECT ?, ?, ?
    )
    SELECT t.* FROM transactions t
    CROSS JOIN search_input search
    WHERE (? IS NULL OR t.type = ?)
      AND (
        search.search_text IS NULL
        OR t.note LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR EXISTS (
          SELECT 1 FROM accounts a
          WHERE a.id IN (t.account_id, t.to_account_id)
            AND a.name LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        )
        OR EXISTS (
          SELECT 1 FROM categories c
          WHERE c.id = t.category_id
            AND c.name LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        )
        OR EXISTS (
          SELECT 1 FROM budgets budget
          WHERE budget.id = t.budget_id
            AND budget.name LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        )
        OR EXISTS (
          SELECT 1
          FROM commitment_payments payment
          JOIN commitments commitment ON commitment.id = payment.commitment_id
          WHERE payment.id = t.commitment_payment_id
            AND (
              commitment.name LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
              OR payment.notes LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
            )
        )
        OR REPLACE(t.type, '_', ' ') LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR CASE t.type
             WHEN 'cc_payment' THEN 'Credit Pay Credit Card Payment'
             WHEN 'expense' THEN 'Expense'
             WHEN 'income' THEN 'Income'
             WHEN 'transfer' THEN 'Transfer'
           END LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR (
          t.type = 'income'
          AND EXISTS (
            SELECT 1 FROM accounts source_account
            WHERE source_account.id = t.account_id
              AND source_account.type = 'credit_card'
          )
          AND 'Card credit' LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        )
        OR (
          search.numeric_amount IS NOT NULL
          AND (
            t.amount = search.numeric_amount
            OR t.to_amount = search.numeric_amount
            OR t.egp_amount = search.numeric_amount
          )
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
    ORDER BY ${TRANSACTION_LIST_ORDER}
    LIMIT ? OFFSET ?
  `;

  return db.getAllAsync<Transaction>(sql, [
    searchParam,
    likePattern,
    numericSearch,
    typeParam,
    typeParam,
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
     ORDER BY ${TRANSACTION_LIST_ORDER}
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

export async function deleteTransactionRow(db: SQLiteDatabase, id: string): Promise<number> {
  const result = await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  return result.changes;
}

export interface UpdateTransactionInput {
  amount: number;
  currency: Currency;
  egp_amount: number;
  to_amount?: number | null;
  exchange_rate?: number | null;
  category_id?: string | null;
  budget_id?: string | null;
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
       COALESCE(SUM(CASE
         WHEN transaction_row.type = 'income' AND account_row.type <> 'credit_card'
           THEN transaction_row.egp_amount
         ELSE 0
       END), 0) AS income,
       COALESCE(SUM(CASE
         WHEN transaction_row.type = 'expense' THEN transaction_row.egp_amount
         WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card'
           THEN -transaction_row.egp_amount
         ELSE 0
       END), 0) AS expense
     FROM transactions transaction_row
     JOIN accounts account_row ON account_row.id = transaction_row.account_id
     WHERE transaction_row.transaction_date >= ?
       AND transaction_row.transaction_date <= ?`,
    [range.from, range.to],
  );
  const incomeEgp = row?.income ?? 0;
  const expenseEgp = row?.expense ?? 0;
  return { incomeEgp, expenseEgp, netEgp: incomeEgp - expenseEgp };
}

export async function updateTransactionRow(
  db: SQLiteDatabase,
  id: string,
  updates: UpdateTransactionInput,
  minimumPaymentSnapshot: number | null,
  revolvingBalanceDelta: number | null,
  updatedAt: string,
): Promise<number> {
  const result = await db.runAsync(
    `UPDATE transactions
       SET amount = ?, currency = ?, egp_amount = ?, exchange_rate = ?,
           to_amount = ?, minimum_payment_snapshot = ?, revolving_balance_delta = ?,
           category_id = ?, budget_id = ?, note = ?, transaction_date = ?, transaction_time = ?,
           updated_at = ?
     WHERE id = ?`,
    [
      updates.amount,
      updates.currency,
      updates.egp_amount,
      updates.exchange_rate ?? null,
      updates.to_amount ?? null,
      minimumPaymentSnapshot,
      revolvingBalanceDelta,
      updates.category_id ?? null,
      updates.budget_id ?? null,
      updates.note ?? null,
      updates.transaction_date,
      updates.transaction_time,
      updatedAt,
      id,
    ],
  );
  return result.changes;
}
