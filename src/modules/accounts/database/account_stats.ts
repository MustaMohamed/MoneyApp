import type { SQLiteDatabase } from 'expo-sqlite';

export interface AccountStats {
  month_in: number;
  month_out: number;
  week_in: number;
  week_out: number;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeDates(now: Date): { monthStart: string; weekStart: string } {
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const day = now.getDay(); // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  return { monthStart, weekStart: toISODate(monday) };
}

export async function getAccountsStats(
  db: SQLiteDatabase,
  accountIds: string[],
  now: Date = new Date(),
): Promise<Record<string, AccountStats>> {
  if (accountIds.length === 0) return {};

  const { monthStart, weekStart } = computeDates(now);
  const earliest = monthStart <= weekStart ? monthStart : weekStart;
  const throughDate = toISODate(now);
  const placeholders = accountIds.map(() => '?').join(',');

  const rows = await db.getAllAsync<{
    account_id: string;
    month_in: number;
    month_out: number;
    week_in: number;
    week_out: number;
  }>(
    `SELECT account_id,
       SUM(month_in)  AS month_in,
       SUM(month_out) AS month_out,
       SUM(week_in)   AS week_in,
       SUM(week_out)  AS week_out
     FROM (
       /* Leg 1: account_id rows — income IN, everything else OUT */
       SELECT
         account_id,
         SUM(CASE WHEN type = 'income'  AND transaction_date >= ? THEN amount ELSE 0 END) AS month_in,
         SUM(CASE WHEN type != 'income' AND transaction_date >= ? THEN amount ELSE 0 END) AS month_out,
         SUM(CASE WHEN type = 'income'  AND transaction_date >= ? THEN amount ELSE 0 END) AS week_in,
         SUM(CASE WHEN type != 'income' AND transaction_date >= ? THEN amount ELSE 0 END) AS week_out
       FROM transactions
       WHERE account_id IN (${placeholders})
         AND transaction_date >= ?
         AND transaction_date <= ?
       GROUP BY account_id

       UNION ALL

       /* Leg 2: to_account_id rows — transfer/cc_payment IN */
       SELECT
         to_account_id AS account_id,
         SUM(CASE WHEN transaction_date >= ? THEN COALESCE(to_amount, amount) ELSE 0 END) AS month_in,
         0 AS month_out,
         SUM(CASE WHEN transaction_date >= ? THEN COALESCE(to_amount, amount) ELSE 0 END) AS week_in,
         0 AS week_out
       FROM transactions
       WHERE to_account_id IN (${placeholders})
         AND type IN ('transfer', 'cc_payment')
         AND transaction_date >= ?
         AND transaction_date <= ?
       GROUP BY to_account_id
     )
     GROUP BY account_id`,
    [
      /* Leg 1 params */
      monthStart,
      monthStart,
      weekStart,
      weekStart,
      ...accountIds,
      earliest,
      throughDate,
      /* Leg 2 params */
      monthStart,
      weekStart,
      ...accountIds,
      earliest,
      throughDate,
    ],
  );

  const result: Record<string, AccountStats> = {};
  for (const row of rows) {
    result[row.account_id] = {
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- SQL aggregates can return NULL even when typed non-nullable
      month_in: row.month_in ?? 0,
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- SQL aggregates can return NULL even when typed non-nullable
      month_out: row.month_out ?? 0,
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- SQL aggregates can return NULL even when typed non-nullable
      week_in: row.week_in ?? 0,
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- SQL aggregates can return NULL even when typed non-nullable
      week_out: row.week_out ?? 0,
    };
  }
  for (const id of accountIds) {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- runtime guard for Record index access
    if (!result[id]) result[id] = { month_in: 0, month_out: 0, week_in: 0, week_out: 0 };
  }
  return result;
}
