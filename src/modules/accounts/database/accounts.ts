import type { SQLiteDatabase } from 'expo-sqlite';

import type { AccountDelta } from '@/modules/transactions/domain/transaction_policy';

import type { Account } from '../entities/account.entity';

export async function getAccounts(db: SQLiteDatabase): Promise<Account[]> {
  return db.getAllAsync<Account>(
    `SELECT * FROM accounts
      WHERE is_archived = 0 AND is_deleted = 0
      ORDER BY sort_order ASC, created_at ASC`,
  );
}

export async function getArchivedAccounts(db: SQLiteDatabase): Promise<Account[]> {
  return db.getAllAsync<Account>(
    `SELECT * FROM accounts
      WHERE is_archived = 1 AND is_deleted = 0
      ORDER BY sort_order ASC, created_at ASC`,
  );
}

export async function getArchivedAccountCount(db: SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM accounts WHERE is_archived = 1 AND is_deleted = 0',
  );
  return result?.count ?? 0;
}

export async function getAccountByIdIncludingArchived(
  db: SQLiteDatabase,
  id: string,
): Promise<Account | undefined> {
  const rows = await db.getAllAsync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
  return rows[0];
}

export async function getAccountsByIdsIncludingArchived(
  db: SQLiteDatabase,
  ids: string[],
): Promise<Account[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  return db.getAllAsync<Account>(
    `SELECT * FROM accounts
      WHERE id IN (${placeholders})
      ORDER BY sort_order ASC, created_at ASC`,
    ids,
  );
}

/** `0 <= revolving_balance <= current_balance` is guarded in `transaction_policy.ts`, not here. */
export async function applyAccountDelta(
  db: SQLiteDatabase,
  delta: AccountDelta,
  updatedAt: string,
): Promise<void> {
  const result =
    delta.revolvingBalance === 0
      ? await db.runAsync(
          `UPDATE accounts
             SET current_balance = current_balance + ?, updated_at = ?
           WHERE id = ?`,
          [delta.currentBalance, updatedAt, delta.accountId],
        )
      : await db.runAsync(
          `UPDATE accounts
             SET current_balance = current_balance + ?,
                 revolving_balance = COALESCE(revolving_balance, 0) + ?,
                 updated_at = ?
           WHERE id = ?`,
          [delta.currentBalance, delta.revolvingBalance, updatedAt, delta.accountId],
        );

  if (result.changes !== 1) {
    throw new Error(`Account delta target not found: ${delta.accountId}`);
  }
}

export async function addAccount(db: SQLiteDatabase, account: Account): Promise<void> {
  await db.runAsync(
    `INSERT INTO accounts (
      id, name, type, currency,
      opening_balance, current_balance,
      color, credit_limit, revolving_balance, minimum_payment,
      statement_due_day, interest_tracking, apr,
      is_archived, is_deleted, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      account.is_deleted,
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

/** The predicate is the guard: the write cannot land on a live or already-deleted row. */
export async function setAccountDeleted(
  db: SQLiteDatabase,
  id: string,
  updated_at: string,
): Promise<number> {
  const result = await db.runAsync(
    `UPDATE accounts
        SET is_deleted = 1, name = '', updated_at = ?
      WHERE id = ? AND is_archived = 1 AND is_deleted = 0`,
    [updated_at, id],
  );
  return result.changes;
}

/** The predicate is the guard, and the subquery reads the active rows at statement time. */
export async function setAccountUnarchived(
  db: SQLiteDatabase,
  id: string,
  updated_at: string,
): Promise<number> {
  const result = await db.runAsync(
    `UPDATE accounts
        SET is_archived = 0,
            sort_order = (
              SELECT COALESCE(MAX(sort_order), -1) + 1 FROM accounts
               WHERE is_archived = 0 AND is_deleted = 0
            ),
            updated_at = ?
      WHERE id = ? AND is_archived = 1 AND is_deleted = 0`,
    [updated_at, id],
  );
  return result.changes;
}

export async function setAccountBalance(
  db: SQLiteDatabase,
  id: string,
  newBalance: number,
  updated_at: string,
): Promise<void> {
  const result = await db.runAsync(
    `UPDATE accounts
        SET current_balance = ?, balance_review_required = 0, updated_at = ?
      WHERE id = ?`,
    [newBalance, updated_at, id],
  );
  if (result.changes !== 1) {
    throw new Error(`Account balance target not found: ${id}`);
  }
}

export async function clearAccountBalanceReview(
  db: SQLiteDatabase,
  id: string,
  updated_at: string,
): Promise<void> {
  const result = await db.runAsync(
    `UPDATE accounts
        SET balance_review_required = 0, updated_at = ?
      WHERE id = ?`,
    [updated_at, id],
  );
  if (result.changes !== 1) {
    throw new Error(`Account balance review target not found: ${id}`);
  }
}
