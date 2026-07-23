import type { SQLiteDatabase } from 'expo-sqlite';

import { shiftYearMonth } from '@/utils/year_month';

export interface DashboardMonthWindow {
  currentYearMonth: string;
  previousYearMonth: string;
  previousMonthStart: string;
  currentMonthStart: string;
  nextMonthStart: string;
}

export interface DashboardTransactionFactRow {
  year_month: string;
  category_id: string | null;
  income_egp: number;
  expense_egp: number;
  usd_native: number;
  transaction_count: number;
}

export interface DashboardBudgetLimitRow {
  category_id: string;
  limit_amount: number;
}

export function resolveDashboardMonthWindow(yearMonth: string): DashboardMonthWindow {
  const previousYearMonth = shiftYearMonth(yearMonth, -1);

  return {
    currentYearMonth: yearMonth,
    previousYearMonth,
    previousMonthStart: `${previousYearMonth}-01`,
    currentMonthStart: `${yearMonth}-01`,
    nextMonthStart: `${shiftYearMonth(yearMonth, 1)}-01`,
  };
}

export async function getDashboardTransactionFactRows(
  db: SQLiteDatabase,
  window: DashboardMonthWindow,
): Promise<DashboardTransactionFactRow[]> {
  return db.getAllAsync<DashboardTransactionFactRow>(
    `SELECT
       CASE
         WHEN transaction_row.transaction_date >= ? THEN ?
         ELSE ?
       END AS year_month,
       CASE
         WHEN transaction_row.transaction_date >= ? THEN transaction_row.category_id
         ELSE NULL
       END AS category_id,
       COALESCE(SUM(CASE
         WHEN transaction_row.type = 'income' AND account_row.type <> 'credit_card'
           THEN transaction_row.egp_amount
         ELSE 0
       END), 0) AS income_egp,
       COALESCE(SUM(CASE
         WHEN transaction_row.type = 'expense' THEN transaction_row.egp_amount
         WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card'
           THEN -transaction_row.egp_amount
         ELSE 0
       END), 0) AS expense_egp,
       COALESCE(SUM(CASE
         WHEN transaction_row.currency = 'USD' AND transaction_row.type = 'expense'
           THEN transaction_row.amount
         WHEN transaction_row.currency = 'USD'
           AND transaction_row.type = 'income'
           AND account_row.type = 'credit_card'
           THEN -transaction_row.amount
         ELSE 0
       END), 0) AS usd_native,
       COALESCE(SUM(CASE
         WHEN transaction_row.type = 'expense' THEN 1
         WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card' THEN 1
         ELSE 0
       END), 0) AS transaction_count
     FROM transactions transaction_row INDEXED BY idx_transactions_date
     JOIN accounts account_row ON account_row.id = transaction_row.account_id
     WHERE transaction_row.transaction_date >= ?
       AND transaction_row.transaction_date < ?
       AND transaction_row.type IN ('expense', 'income')
     GROUP BY year_month, category_id
     ORDER BY year_month ASC, category_id ASC`,
    [
      window.currentMonthStart,
      window.currentYearMonth,
      window.previousYearMonth,
      window.currentMonthStart,
      window.previousMonthStart,
      window.nextMonthStart,
    ],
  );
}

export async function getDashboardBudgetLimitRows(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<DashboardBudgetLimitRow[]> {
  return db.getAllAsync<DashboardBudgetLimitRow>(
    `SELECT category_id, COALESCE(SUM(limit_amount), 0) AS limit_amount
       FROM budgets
      WHERE effective_from = ?
      GROUP BY category_id
      ORDER BY category_id ASC`,
    [yearMonth],
  );
}
