import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import type { Currency } from '@/constants/enums';
import { TransactionType } from '@/constants/enums';
import { parseDecimalText } from '@/utils/parse_decimal';

import type { Transaction } from '../entities/transaction.entity';
import { REPORTING_SIGN_SQL } from './reporting_sign';

export interface MonthExpenseStats {
  totalEgp: number;
  egpNative: number;
  usdNative: number;
  count: number;
}

/** Card credits subtract from spend yet count as rows; transfers and CC payments are excluded. */
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
       COALESCE(SUM((${REPORTING_SIGN_SQL.out}) * transaction_row.egp_amount), 0) AS total,
       COALESCE(SUM(CASE
         WHEN transaction_row.currency = 'EGP'
           THEN (${REPORTING_SIGN_SQL.out}) * transaction_row.amount
         ELSE 0
       END), 0) AS egp_native,
       COALESCE(SUM(CASE
         WHEN transaction_row.currency = 'USD'
           THEN (${REPORTING_SIGN_SQL.out}) * transaction_row.amount
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
const NEWEST_DAY_FIRST = 'transaction_date DESC';
const TRANSACTION_LIST_ORDER = `${NEWEST_DAY_FIRST},
  transaction_time DESC,
  created_at DESC,
  id DESC`;

function escapeLike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function buildInClause(n: number): string {
  return Array(n).fill('?').join(',');
}

type TransactionListFilterInput = Omit<TransactionListQuery, 'limit' | 'offset'>;

interface TransactionFilterSql {
  joins: string;
  where: string;
  params: SQLiteBindValue[];
}

const SEARCH_JOINS = `
    CROSS JOIN (SELECT ? AS pattern, ? AS numeric_amount) search
    LEFT JOIN accounts destination_account ON destination_account.id = transaction_row.to_account_id
    LEFT JOIN categories category ON category.id = transaction_row.category_id
    LEFT JOIN budgets budget ON budget.id = transaction_row.budget_id
    LEFT JOIN commitment_payments payment ON payment.id = transaction_row.commitment_payment_id
    LEFT JOIN commitments commitment ON commitment.id = payment.commitment_id`;

const SOURCE_ACCOUNT_JOIN =
  'JOIN accounts account_row ON account_row.id = transaction_row.account_id';

const SEARCH_PREDICATE = `(
        transaction_row.note LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR account_row.name LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR destination_account.name LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR category.name LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR budget.name LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR commitment.name LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR payment.notes LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR REPLACE(transaction_row.type, '_', ' ') LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR CASE transaction_row.type
             WHEN 'cc_payment' THEN 'Credit Pay Credit Card Payment'
             WHEN 'expense' THEN 'Expense'
             WHEN 'income' THEN 'Income'
             WHEN 'transfer' THEN 'Transfer'
           END LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        OR (
          transaction_row.type = 'income'
          AND account_row.type = 'credit_card'
          AND 'Card credit' LIKE search.pattern ESCAPE '\\' COLLATE NOCASE
        )
        OR (
          search.numeric_amount IS NOT NULL
          AND (
            transaction_row.amount = search.numeric_amount
            OR transaction_row.to_amount = search.numeric_amount
            OR transaction_row.egp_amount = search.numeric_amount
          )
        )
      )`;

function buildTransactionFilterSql(
  query: TransactionListFilterInput,
  sourceAccountJoined: boolean,
): TransactionFilterSql {
  const clauses: string[] = [];
  const whereParams: SQLiteBindValue[] = [];
  const trimmed = query.search?.trim();
  const searchText = trimmed && trimmed.length > 0 ? trimmed : undefined;
  const accountIds = query.accountIds ?? [];
  const categoryIds = query.categoryIds ?? [];
  const amountCurrency = query.amountCurrency ?? null;
  // Unary + keeps a dated query on idx_transactions_date: with no ANALYZE, SQLite prefers an equality index.
  const equality = query.dateFrom !== undefined || query.dateTo !== undefined ? '+' : '';

  if (query.dateFrom !== undefined) {
    clauses.push('transaction_row.transaction_date >= ?');
    whereParams.push(query.dateFrom);
  }
  if (query.dateTo !== undefined) {
    clauses.push('transaction_row.transaction_date <= ?');
    whereParams.push(query.dateTo);
  }
  if (query.type !== undefined) {
    clauses.push(`${equality}transaction_row.type = ?`);
    whereParams.push(query.type);
  }
  if (searchText !== undefined) clauses.push(SEARCH_PREDICATE);
  if (accountIds.length > 0) {
    const accountIn = buildInClause(accountIds.length);
    clauses.push(
      `(${equality}transaction_row.account_id IN (${accountIn}) OR ${equality}transaction_row.to_account_id IN (${accountIn}))`,
    );
    whereParams.push(...accountIds, ...accountIds);
  }
  // NULL category_id rows (transfers, CC payments) drop out under a category filter, per spec §6.3.
  if (categoryIds.length > 0) {
    clauses.push(
      `${equality}transaction_row.category_id IN (${buildInClause(categoryIds.length)})`,
    );
    whereParams.push(...categoryIds);
  }
  if (query.amountMin !== undefined) {
    clauses.push('transaction_row.currency = ? AND transaction_row.amount >= ?');
    whereParams.push(amountCurrency, query.amountMin);
  }
  if (query.amountMax !== undefined) {
    clauses.push('transaction_row.currency = ? AND transaction_row.amount <= ?');
    whereParams.push(amountCurrency, query.amountMax);
  }

  const joinParams: SQLiteBindValue[] =
    searchText === undefined
      ? []
      : [`%${escapeLike(searchText)}%`, parseDecimalText(searchText) ?? null];
  return {
    joins:
      searchText === undefined
        ? ''
        : `${SEARCH_JOINS}${sourceAccountJoined ? '' : `\n    LEFT ${SOURCE_ACCOUNT_JOIN}`}`,
    where: clauses.length === 0 ? '' : `WHERE ${clauses.join('\n      AND ')}`,
    params: [...joinParams, ...whereParams],
  };
}

export async function getTransactions(
  db: SQLiteDatabase,
  query: TransactionListQuery = {},
): Promise<Transaction[]> {
  const limit = query.limit ?? PAGE_SIZE_DEFAULT;
  const offset = query.offset ?? 0;
  const filter = buildTransactionFilterSql(query, false);
  return db.getAllAsync<Transaction>(
    `SELECT transaction_row.* FROM transactions transaction_row
    ${filter.joins}
    ${filter.where}
    ORDER BY ${TRANSACTION_LIST_ORDER}
    LIMIT ? OFFSET ?`,
    [...filter.params, limit, offset],
  );
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

export async function getTransactionCountByAccount(
  db: SQLiteDatabase,
  accountId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM transactions WHERE account_id = ? OR to_account_id = ?',
    [accountId, accountId],
  );
  return row?.count ?? 0;
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

/** Inclusive `[from, to]`; excludes transfers and cc_payments, which do not change net worth. */
export async function getPeriodTotals(
  db: SQLiteDatabase,
  range: { from: string; to: string },
): Promise<PeriodTotals> {
  return getTransactionScopedTotals(db, { dateFrom: range.from, dateTo: range.to });
}

export interface TransactionDayAggregate {
  date: string;
  netEgp: number;
  count: number;
}

export interface TransactionMonthAggregate {
  days: TransactionDayAggregate[];
  matchCount: number;
  matchNetEgp: number;
  scoped: PeriodTotals;
}

export type TransactionAggregateQuery = Omit<TransactionListFilterInput, 'dateFrom' | 'dateTo'> & {
  dateFrom: string;
  dateTo: string;
};

export type TransactionTotalsScope = Pick<
  TransactionAggregateQuery,
  'dateFrom' | 'dateTo' | 'accountIds'
>;

/** Out, In and Net over the date range, scoped by the accounts filter alone; other filters are ignored. */
export async function getTransactionScopedTotals(
  db: SQLiteDatabase,
  scope: TransactionTotalsScope,
): Promise<PeriodTotals> {
  const filter = buildTransactionFilterSql(
    { dateFrom: scope.dateFrom, dateTo: scope.dateTo, accountIds: scope.accountIds },
    true,
  );
  const row = await db.getFirstAsync<{ income: number | null; expense: number | null }>(
    `SELECT
       COALESCE(SUM((${REPORTING_SIGN_SQL.in}) * transaction_row.egp_amount), 0) AS income,
       COALESCE(SUM((${REPORTING_SIGN_SQL.out}) * transaction_row.egp_amount), 0) AS expense
     FROM transactions transaction_row
     ${SOURCE_ACCOUNT_JOIN}
     ${filter.where}`,
    filter.params,
  );
  const incomeEgp = row?.income ?? 0;
  const expenseEgp = row?.expense ?? 0;
  return { incomeEgp, expenseEgp, netEgp: incomeEgp - expenseEgp };
}

/** Days and tally take the full filter; `scoped` is `getTransactionScopedTotals` over the same query. */
export async function getTransactionMonthAggregate(
  db: SQLiteDatabase,
  query: TransactionAggregateQuery,
): Promise<TransactionMonthAggregate> {
  const filtered = buildTransactionFilterSql(query, true);
  const dayRows = await db.getAllAsync<{ date: string; net: number; count: number }>(
    `SELECT
       transaction_row.transaction_date AS date,
       COALESCE(SUM(((${REPORTING_SIGN_SQL.in}) - (${REPORTING_SIGN_SQL.out})) * transaction_row.egp_amount), 0) AS net,
       COUNT(*) AS count
     FROM transactions transaction_row
     ${SOURCE_ACCOUNT_JOIN}
     ${filtered.joins}
     ${filtered.where}
     GROUP BY transaction_row.transaction_date
     ORDER BY transaction_row.${NEWEST_DAY_FIRST}`,
    filtered.params,
  );
  const scoped = await getTransactionScopedTotals(db, query);
  const days = dayRows.map((row) => ({ date: row.date, netEgp: row.net, count: row.count }));
  return {
    days,
    matchCount: days.reduce((total, day) => total + day.count, 0),
    matchNetEgp: days.reduce((total, day) => total + day.netEgp, 0),
    scoped,
  };
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
