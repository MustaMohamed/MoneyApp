import type { SQLiteDatabase } from 'expo-sqlite';

// Sum of expense egp_amount per (category, calendar month) for the requested months.
// type='expense' only (transfers / income / cc_payment excluded). Commitment-payment
// expense rows ARE included by design (no commitment_payment_id filter). Shape:
//   { [categoryId]: { [yearMonth]: number } }
export async function getCategorySpendByMonth(
  db: SQLiteDatabase,
  yearMonths: string[],
): Promise<Record<string, Record<string, number>>> {
  if (yearMonths.length === 0) return {};
  const placeholders = yearMonths.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ category_id: string; ym: string; spent: number }>(
    `SELECT category_id,
            substr(transaction_date, 1, 7) AS ym,
            COALESCE(SUM(egp_amount), 0)   AS spent
       FROM transactions
      WHERE type = 'expense'
        AND category_id IS NOT NULL
        AND substr(transaction_date, 1, 7) IN (${placeholders})
      GROUP BY category_id, ym`,
    yearMonths,
  );

  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    (out[r.category_id] ??= {})[r.ym] = r.spent;
  }
  return out;
}

// Spend attributed to named monthly budgets. Corrupted assignments are ignored unless
// transaction type, category, and calendar month all match the referenced budget.
export async function getBudgetSpendByMonth(
  db: SQLiteDatabase,
  yearMonths: string[],
): Promise<Record<string, number>> {
  if (yearMonths.length === 0) return {};
  const placeholders = yearMonths.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ budget_id: string; spent: number }>(
    `SELECT budget.id AS budget_id,
            COALESCE(SUM(transaction_row.egp_amount), 0) AS spent
       FROM budgets budget
       LEFT JOIN transactions transaction_row
         ON transaction_row.budget_id = budget.id
        AND transaction_row.type = 'expense'
        AND transaction_row.category_id = budget.category_id
        AND substr(transaction_row.transaction_date, 1, 7) = budget.effective_from
      WHERE budget.effective_from IN (${placeholders})
      GROUP BY budget.id`,
    yearMonths,
  );

  return Object.fromEntries(rows.map((row) => [row.budget_id, row.spent]));
}

/**
 * Returns the rounded average monthly income over the last N complete months
 * (relative to `currentYearMonth`, which is the current "YYYY-MM" string).
 * Income = transactions with type = 'income'.
 * A "complete month" is any month strictly before currentYearMonth.
 * Returns null when there is no qualifying income history.
 */
export async function getTrailingIncomeSuggestion(
  db: SQLiteDatabase,
  currentYearMonth: string,
  windowMonths = 3,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ suggestion: number | null }>(
    `SELECT ROUND(AVG(monthly_total)) AS suggestion
       FROM (
         SELECT SUM(egp_amount) AS monthly_total
           FROM transactions
          WHERE type = 'income'
            AND substr(transaction_date, 1, 7) < ?
          GROUP BY substr(transaction_date, 1, 7)
          ORDER BY substr(transaction_date, 1, 7) DESC
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
            COALESCE(SUM(transaction_row.egp_amount), 0) AS spent
       FROM spending_plans plan
       JOIN spending_plan_categories assignment ON assignment.plan_id = plan.id
       LEFT JOIN transactions transaction_row
         ON transaction_row.category_id = assignment.category_id
        AND transaction_row.type = 'expense'
        AND transaction_row.transaction_date >= plan.start_date
        AND transaction_row.transaction_date <= plan.end_date
      WHERE plan.id IN (${placeholders})
      GROUP BY plan.id, assignment.category_id`,
    planIds,
  );
  const out: Record<string, Record<string, number>> = {};
  for (const row of rows) (out[row.plan_id] ??= {})[row.category_id] = row.spent;
  return out;
}
