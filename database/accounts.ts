import type { SQLiteDatabase } from 'expo-sqlite';

import type { Account } from './entities/account.entity';

export async function getAccounts(db: SQLiteDatabase): Promise<Account[]> {
  return db.getAllAsync<Account>(
    'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY sort_order ASC, created_at ASC',
  );
}

export async function addAccount(db: SQLiteDatabase, account: Account): Promise<void> {
  await db.runAsync(
    `INSERT INTO accounts (
      id, name, type, currency,
      opening_balance, current_balance,
      color, credit_limit, revolving_balance, minimum_payment,
      statement_due_day, interest_tracking, apr,
      is_archived, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account.id,
      account.name,
      account.type,
      account.currency,
      account.opening_balance,
      account.current_balance,
      account.color,
      account.credit_limit,
      account.revolving_balance,
      account.minimum_payment,
      account.statement_due_day,
      account.interest_tracking,
      account.apr,
      account.is_archived,
      account.sort_order,
      account.created_at,
      account.updated_at,
    ],
  );
}

export async function updateAccount(
  db: SQLiteDatabase,
  id: string,
  data: { name: string; color: string | null; updated_at: string },
): Promise<void> {
  await db.runAsync('UPDATE accounts SET name = ?, color = ?, updated_at = ? WHERE id = ?', [
    data.name,
    data.color,
    data.updated_at,
    id,
  ]);
}

export async function archiveAccount(
  db: SQLiteDatabase,
  id: string,
  updated_at: string,
): Promise<void> {
  await db.runAsync('UPDATE accounts SET is_archived = 1, updated_at = ? WHERE id = ?', [
    updated_at,
    id,
  ]);
}

export async function setAccountBalance(
  db: SQLiteDatabase,
  id: string,
  newBalance: number,
  updated_at: string,
): Promise<void> {
  await db.runAsync('UPDATE accounts SET current_balance = ?, updated_at = ? WHERE id = ?', [
    newBalance,
    updated_at,
    id,
  ]);
}
