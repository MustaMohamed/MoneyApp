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
