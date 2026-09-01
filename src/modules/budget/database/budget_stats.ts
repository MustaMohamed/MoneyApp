import type { SQLiteDatabase } from 'expo-sqlite';

// Net spend per (category, month); credits on credit-card accounts subtract from expenses.
export async function getCategorySpendByMonth(
  db: SQLiteDatabase,
  yearMonths: string[],
): Promise<Record<string, Record<string, number>>> {
  if (yearMonths.length === 0) return {};
  const placeholders = yearMonths.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ category_id: string; ym: string; spent: number }>(
    `SELECT transaction_row.category_id AS category_id,
            substr(transaction_row.transaction_date, 1, 7) AS ym,
            COALESCE(SUM(CASE
              WHEN transaction_row.type = 'expense' THEN transaction_row.egp_amount
              WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card'
                THEN -transaction_row.egp_amount
              ELSE 0
            END), 0) AS spent
       FROM transactions transaction_row
       JOIN accounts account_row ON account_row.id = transaction_row.account_id
      WHERE transaction_row.type IN ('expense', 'income')
        AND transaction_row.category_id IS NOT NULL
        AND substr(transaction_row.transaction_date, 1, 7) IN (${placeholders})
      GROUP BY transaction_row.category_id, ym`,
    yearMonths,
  );

  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    (out[r.category_id] ??= {})[r.ym] = Math.max(0, r.spent);
  }
  return out;
}

// A transaction counts only when its type, category and month all match the budget it names.
export async function getBudgetSpendByMonth(
  db: SQLiteDatabase,
  yearMonths: string[],
): Promise<Record<string, number>> {
  if (yearMonths.length === 0) return {};
  const placeholders = yearMonths.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ budget_id: string; spent: number }>(
    `SELECT budget.id AS budget_id,
            COALESCE(SUM(CASE
              WHEN transaction_row.type = 'expense' THEN transaction_row.egp_amount
              WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card'
                THEN -transaction_row.egp_amount
              ELSE 0
            END), 0) AS spent
       FROM budgets budget
       LEFT JOIN transactions transaction_row
         ON transaction_row.budget_id = budget.id
        AND transaction_row.type IN ('expense', 'income')
        AND transaction_row.category_id = budget.category_id
        AND substr(transaction_row.transaction_date, 1, 7) = budget.effective_from
       LEFT JOIN accounts account_row ON account_row.id = transaction_row.account_id
      WHERE budget.effective_from IN (${placeholders})
      GROUP BY budget.id`,
    yearMonths,
  );

  return Object.fromEntries(rows.map((row) => [row.budget_id, Math.max(0, row.spent)]));
}

/** Averages non-card cash income over the N months strictly before `currentYearMonth`. */
export async function getTrailingIncomeSuggestion(
  db: SQLiteDatabase,
  currentYearMonth: string,
  windowMonths = 3,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ suggestion: number | null }>(
    `SELECT ROUND(AVG(monthly_total)) AS suggestion
       FROM (
         SELECT SUM(transaction_row.egp_amount) AS monthly_total
           FROM transactions transaction_row
           JOIN accounts account_row ON account_row.id = transaction_row.account_id
          WHERE transaction_row.type = 'income'
            AND account_row.type <> 'credit_card'
            AND substr(transaction_row.transaction_date, 1, 7) < ?
          GROUP BY substr(transaction_row.transaction_date, 1, 7)
          ORDER BY substr(transaction_row.transaction_date, 1, 7) DESC
          LIMIT ?
       )`,
    [currentYearMonth, windowMonths],
  );
  return row?.suggestion ?? null;
}

export async function getSpendingPlanSpend(
  db: SQLiteDatabase,
  planIds: string[],
): Promise<Record<string, Record<string, number>>> {
  if (planIds.length === 0) return {};
  const placeholders = planIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ plan_id: string; category_id: string; spent: number }>(
    `SELECT plan.id AS plan_id,
            assignment.category_id AS category_id,
            COALESCE(SUM(CASE
              WHEN transaction_row.type = 'expense' THEN transaction_row.egp_amount
              WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card'
                THEN -transaction_row.egp_amount
              ELSE 0
            END), 0) AS spent
       FROM spending_plans plan
       JOIN spending_plan_categories assignment ON assignment.plan_id = plan.id
       LEFT JOIN transactions transaction_row
         ON transaction_row.category_id = assignment.category_id
        AND transaction_row.type IN ('expense', 'income')
        AND transaction_row.transaction_date >= plan.start_date
        AND transaction_row.transaction_date <= plan.end_date
       LEFT JOIN accounts account_row ON account_row.id = transaction_row.account_id
      WHERE plan.id IN (${placeholders})
      GROUP BY plan.id, assignment.category_id`,
    planIds,
  );
  const out: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    (out[row.plan_id] ??= {})[row.category_id] = Math.max(0, row.spent);
  }
  return out;
}
