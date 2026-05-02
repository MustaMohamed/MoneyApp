import type { SQLiteDatabase } from 'expo-sqlite';

import type { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from './entities/transaction.entity';

export async function addTransaction(db: SQLiteDatabase, tx: Transaction): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO transactions (
        id, type, amount, currency, egp_amount, exchange_rate,
        account_id, to_account_id, category_id, note,
        transaction_date, transaction_time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.type,
        tx.amount,
        tx.currency,
        tx.egp_amount,
        tx.exchange_rate,
        tx.account_id,
        tx.to_account_id,
        tx.category_id,
        tx.note,
        tx.transaction_date,
        tx.transaction_time,
        tx.created_at,
        tx.updated_at,
      ],
    );

    const now = tx.updated_at;

    if (tx.type === 'expense') {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.egp_amount, now, tx.account_id],
      );
    } else if (tx.type === 'income') {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.egp_amount, now, tx.account_id],
      );
    } else if (tx.type === 'transfer') {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.egp_amount, now, tx.account_id],
      );
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.egp_amount, now, tx.to_account_id],
      );
    } else if (tx.type === 'cc_payment') {
      // Debit source asset account
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.egp_amount, now, tx.account_id],
      );
      // Credit CC account: installment monthly due first, remainder to revolving_balance
      const [cc] = await db.getAllAsync<{
        revolving_balance: number | null;
        minimum_payment: number | null;
      }>('SELECT revolving_balance, minimum_payment FROM accounts WHERE id = ?', [
        tx.to_account_id,
      ]);
      const revolving = cc?.revolving_balance ?? 0;
      const installmentDue = cc?.minimum_payment ?? 0;
      const installmentCovered = Math.min(tx.egp_amount, installmentDue);
      const revolvingReduction = Math.max(0, tx.egp_amount - installmentCovered);
      const newRevolving = Math.max(0, revolving - revolvingReduction);
      await db.runAsync(
        `UPDATE accounts
           SET current_balance   = current_balance - ?,
               revolving_balance = ?,
               updated_at        = ?
         WHERE id = ?`,
        [tx.egp_amount, newRevolving, now, tx.to_account_id],
      );
    }
  });
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

function escapeLike(input: string): string {
  // Escape SQL LIKE wildcards so user input can't act as a wildcard.
  // \ is the escape char declared by the ESCAPE clause below.
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function buildInClause(n: number): string {
  return Array(n).fill('?').join(',');
}

export async function getTransactions(
  db: SQLiteDatabase,
  query: TransactionListQuery = {},
): Promise<Transaction[]> {
  const limit = query.limit ?? PAGE_SIZE_DEFAULT;
  const offset = query.offset ?? 0;

  const typeParam: string | null = query.type ?? null;
  const trimmed = query.search?.trim();
  const searchParam: string | null = trimmed && trimmed.length > 0 ? trimmed : null;
  const likePattern = searchParam !== null ? `%${escapeLike(searchParam)}%` : null;

  const accountIds = query.accountIds ?? [];
  const categoryIds = query.categoryIds ?? [];
  const accountListEmpty = accountIds.length === 0 ? 1 : 0;
  const categoryListEmpty = categoryIds.length === 0 ? 1 : 0;
  const accountIn = buildInClause(Math.max(accountIds.length, 1));
  const categoryIn = buildInClause(Math.max(categoryIds.length, 1));
  const accountParams = accountIds.length === 0 ? [''] : accountIds;
  const categoryParams = categoryIds.length === 0 ? [''] : categoryIds;

  const dateFrom = query.dateFrom ?? null;
  const dateTo = query.dateTo ?? null;

  const amountMin = query.amountMin ?? null;
  const amountMax = query.amountMax ?? null;
  const amountCurrency = query.amountCurrency ?? null;

  const sql = `
    SELECT t.* FROM transactions t
    WHERE (? IS NULL OR t.type = ?)
      AND (
        ? IS NULL
        OR t.note LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR EXISTS (
          SELECT 1 FROM accounts a
          WHERE a.id IN (t.account_id, t.to_account_id)
            AND a.name LIKE ? ESCAPE '\\' COLLATE NOCASE
        )
        OR EXISTS (
          SELECT 1 FROM categories c
          WHERE c.id = t.category_id
            AND c.name LIKE ? ESCAPE '\\' COLLATE NOCASE
        )
      )
      AND (
        ? = 1
        OR t.account_id    IN (${accountIn})
        OR t.to_account_id IN (${accountIn})
      )
      AND (
        ? = 1
        OR t.category_id IN (${categoryIn})
        -- NULL category_id rows (transfers, CC payments) are intentionally excluded
        -- when a category filter is active. This is by design per spec §6.3.
      )
      AND (? IS NULL OR t.transaction_date >= ?)
      AND (? IS NULL OR t.transaction_date <= ?)
      AND (? IS NULL OR (t.currency = ? AND t.amount >= ?))
      AND (? IS NULL OR (t.currency = ? AND t.amount <= ?))
    ORDER BY t.transaction_date DESC, t.transaction_time DESC
    LIMIT ? OFFSET ?
  `;

  return db.getAllAsync<Transaction>(sql, [
    typeParam,
    typeParam,
    searchParam,
    likePattern,
    likePattern,
    likePattern,
    accountListEmpty,
    ...accountParams,
    ...accountParams,
    categoryListEmpty,
    ...categoryParams,
    dateFrom,
    dateFrom,
    dateTo,
    dateTo,
    amountMin,
    amountCurrency,
    amountMin,
    amountMax,
    amountCurrency,
    amountMax,
    limit,
    offset,
  ]);
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
     ORDER BY transaction_date DESC, transaction_time DESC
     LIMIT ? OFFSET ?`,
    [accountId, accountId, limit, offset],
  );
}

export async function getTransactionById(
  db: SQLiteDatabase,
  id: string,
): Promise<Transaction | null> {
  const rows = await db.getAllAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function deleteTransaction(db: SQLiteDatabase, id: string): Promise<void> {
  const rows = await db.getAllAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  const tx = rows[0];
  if (!tx) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);

    const now = new Date().toISOString();

    if (tx.type === 'expense') {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.egp_amount, now, tx.account_id],
      );
    } else if (tx.type === 'income') {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.egp_amount, now, tx.account_id],
      );
    } else if (tx.type === 'transfer') {
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.egp_amount, now, tx.account_id],
      );
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [tx.egp_amount, now, tx.to_account_id],
      );
    } else if (tx.type === 'cc_payment') {
      // Reverse asset debit
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [tx.egp_amount, now, tx.account_id],
      );
      // Recompute the installment-first split that addTransaction performed,
      // and restore both current_balance and revolving_balance on the CC account.
      const [cc] = await db.getAllAsync<{ minimum_payment: number | null }>(
        'SELECT minimum_payment FROM accounts WHERE id = ?',
        [tx.to_account_id],
      );
      const installmentDue = cc?.minimum_payment ?? 0;
      const installmentCovered = Math.min(tx.egp_amount, installmentDue);
      const revolvingRestore = Math.max(0, tx.egp_amount - installmentCovered);
      await db.runAsync(
        `UPDATE accounts
           SET current_balance   = current_balance + ?,
               revolving_balance = revolving_balance + ?,
               updated_at        = ?
         WHERE id = ?`,
        [tx.egp_amount, revolvingRestore, now, tx.to_account_id],
      );
    }
  });
}

export interface UpdateTransactionInput {
  amount: number;
  currency: Currency;
  egp_amount: number;
  exchange_rate?: number | null;
  category_id?: string | null;
  note?: string | null;
  transaction_date: string;
  transaction_time: string;
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: string,
  updates: UpdateTransactionInput,
): Promise<void> {
  const rows = await db.getAllAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  const existing = rows[0];
  if (!existing) return;

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (existing.type === 'expense') {
      const delta = updates.egp_amount - existing.egp_amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.account_id],
      );
    } else if (existing.type === 'income') {
      const delta = updates.egp_amount - existing.egp_amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.account_id],
      );
    } else if (existing.type === 'transfer') {
      const delta = updates.egp_amount - existing.egp_amount;
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.account_id],
      );
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [delta, now, existing.to_account_id],
      );
    } else if (existing.type === 'cc_payment') {
      // For CC payment, simple delta math is incorrect because the installment-first
      // split means the old amount affected revolving_balance non-linearly.
      // Strategy: reverse the old payment (same logic as deleteTransaction for cc_payment),
      // then apply the new payment (same logic as addTransaction for cc_payment).

      // --- Reverse old payment ---
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
        [existing.egp_amount, now, existing.account_id],
      );
      const [ccForReverse] = await db.getAllAsync<{
        minimum_payment: number | null;
        revolving_balance: number | null;
      }>('SELECT minimum_payment, revolving_balance FROM accounts WHERE id = ?', [
        existing.to_account_id,
      ]);
      const oldInstallmentDue = ccForReverse?.minimum_payment ?? 0;
      const oldInstallmentCovered = Math.min(existing.egp_amount, oldInstallmentDue);
      const oldRevolvingRestore = Math.max(0, existing.egp_amount - oldInstallmentCovered);
      await db.runAsync(
        `UPDATE accounts
           SET current_balance   = current_balance + ?,
               revolving_balance = revolving_balance + ?,
               updated_at        = ?
         WHERE id = ?`,
        [existing.egp_amount, oldRevolvingRestore, now, existing.to_account_id],
      );

      // --- Apply new payment ---
      await db.runAsync(
        'UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
        [updates.egp_amount, now, existing.account_id],
      );
      const [ccForApply] = await db.getAllAsync<{
        revolving_balance: number | null;
        minimum_payment: number | null;
      }>('SELECT revolving_balance, minimum_payment FROM accounts WHERE id = ?', [
        existing.to_account_id,
      ]);
      const newRevolving = ccForApply?.revolving_balance ?? 0;
      const newInstallmentDue = ccForApply?.minimum_payment ?? 0;
      const newInstallmentCovered = Math.min(updates.egp_amount, newInstallmentDue);
      const newRevolvingReduction = Math.max(0, updates.egp_amount - newInstallmentCovered);
      const finalRevolving = Math.max(0, newRevolving - newRevolvingReduction);
      await db.runAsync(
        `UPDATE accounts
           SET current_balance   = current_balance - ?,
               revolving_balance = ?,
               updated_at        = ?
         WHERE id = ?`,
        [updates.egp_amount, finalRevolving, now, existing.to_account_id],
      );
    }

    await db.runAsync(
      `UPDATE transactions
         SET amount = ?, currency = ?, egp_amount = ?, exchange_rate = ?,
             category_id = ?, note = ?, transaction_date = ?, transaction_time = ?,
             updated_at = ?
       WHERE id = ?`,
      [
        updates.amount,
        updates.currency,
        updates.egp_amount,
        updates.exchange_rate ?? null,
        updates.category_id ?? null,
        updates.note ?? null,
        updates.transaction_date,
        updates.transaction_time,
        now,
        id,
      ],
    );
  });
}
