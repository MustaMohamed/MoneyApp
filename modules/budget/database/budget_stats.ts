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
