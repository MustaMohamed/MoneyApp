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

function computeDates(): { monthStart: string; weekStart: string } {
  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const day = today.getDay(); // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  return { monthStart, weekStart: toISODate(monday) };
}

export async function getAccountsStats(
  db: SQLiteDatabase,
  accountIds: string[],
): Promise<Record<string, AccountStats>> {
  if (accountIds.length === 0) return {};

  const { monthStart, weekStart } = computeDates();
  const earliest = monthStart <= weekStart ? monthStart : weekStart;
  const placeholders = accountIds.map(() => '?').join(',');

  const rows = await db.getAllAsync<{
    account_id: string;
    month_in: number;
    month_out: number;
    week_in: number;
    week_out: number;
  }>(
    `SELECT
       account_id,
       SUM(CASE WHEN type = 'income'  AND transaction_date >= ? THEN amount ELSE 0 END) AS month_in,
       SUM(CASE WHEN type = 'expense' AND transaction_date >= ? THEN amount ELSE 0 END) AS month_out,
       SUM(CASE WHEN type = 'income'  AND transaction_date >= ? THEN amount ELSE 0 END) AS week_in,
       SUM(CASE WHEN type = 'expense' AND transaction_date >= ? THEN amount ELSE 0 END) AS week_out
     FROM transactions
     WHERE account_id IN (${placeholders})
       AND type IN ('income', 'expense')
       AND transaction_date >= ?
     GROUP BY account_id`,
    [monthStart, monthStart, weekStart, weekStart, ...accountIds, earliest],
  );

  const result: Record<string, AccountStats> = {};
  for (const row of rows) {
    result[row.account_id] = {
      month_in: row.month_in ?? 0,
      month_out: row.month_out ?? 0,
      week_in: row.week_in ?? 0,
      week_out: row.week_out ?? 0,
    };
  }
  for (const id of accountIds) {
    if (!result[id]) result[id] = { month_in: 0, month_out: 0, week_in: 0, week_out: 0 };
  }
  return result;
}
