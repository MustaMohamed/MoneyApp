import type { SQLiteDatabase } from 'expo-sqlite';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { applyAccountDelta } from '@/modules/accounts/database/accounts';
import { insertTransactionRow } from '@/modules/transactions/database/transactions';
import type { AccountDelta } from '@/modules/transactions/domain/transaction_policy';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

import type { CommitmentPayment } from '../entities/commitment_payment.entity';

/**
 * Get payments for a given month (YYYY-MM format).
 * Returns payments whose due_date falls within the selected month.
 */
export async function getPaymentsByMonth(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<CommitmentPayment[]> {
  const monthStart = `${yearMonth}-01`;

  // Compute first day of next month
  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  return db.getAllAsync<CommitmentPayment>(
    `SELECT * FROM commitment_payments
     WHERE due_date >= ? AND due_date < ?
     ORDER BY due_date ASC, status DESC`,
    [monthStart, nextMonthStr],
  );
}

/** Full payment history for a commitment (for C4 detail screen). */
export async function getPaymentsByCommitment(
  db: SQLiteDatabase,
  commitmentId: string,
): Promise<CommitmentPayment[]> {
  return db.getAllAsync<CommitmentPayment>(
    'SELECT * FROM commitment_payments WHERE commitment_id = ? ORDER BY due_date ASC',
    [commitmentId],
  );
}

/** Single payment lookup. */
export async function getPaymentById(
  db: SQLiteDatabase,
  id: string,
): Promise<CommitmentPayment | null> {
  const rows = await db.getAllAsync<CommitmentPayment>(
    'SELECT * FROM commitment_payments WHERE id = ?',
    [id],
  );
  return rows[0] ?? null;
}

/** Batch insert for payment generation (idempotent — uses INSERT OR IGNORE). */
export async function addPayments(
  db: SQLiteDatabase,
  payments: CommitmentPayment[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const p of payments) {
      await db.runAsync(
        `INSERT OR IGNORE INTO commitment_payments
          (id, commitment_id, due_date, paid_date, skipped_date, amount_due, amount_paid,
           currency, exchange_rate_snapshot, account_id, transaction_id, status, notes,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.commitment_id,
          p.due_date,
          p.paid_date,
          p.skipped_date,
          p.amount_due,
          p.amount_paid,
          p.currency,
          p.exchange_rate_snapshot,
          p.account_id,
          p.transaction_id,
          p.status,
          p.notes,
          p.created_at,
          p.updated_at,
        ],
      );
    }
  });
}

/** Generic status update with optional extra fields. */
export async function updatePaymentStatus(
  db: SQLiteDatabase,
  id: string,
  status: string,
  fields?: {
    paid_date?: string;
    skipped_date?: string;
    amount_paid?: number;
    account_id?: string;
    exchange_rate_snapshot?: number;
    transaction_id?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE commitment_payments SET
      status = ?,
      paid_date = COALESCE(?, paid_date),
      skipped_date = COALESCE(?, skipped_date),
      amount_paid = COALESCE(?, amount_paid),
      account_id = COALESCE(?, account_id),
      exchange_rate_snapshot = COALESCE(?, exchange_rate_snapshot),
      transaction_id = COALESCE(?, transaction_id),
      updated_at = ?
     WHERE id = ?`,
    [
      status,
      fields?.paid_date ?? null,
      fields?.skipped_date ?? null,
      fields?.amount_paid ?? null,
      fields?.account_id ?? null,
      fields?.exchange_rate_snapshot ?? null,
      fields?.transaction_id ?? null,
      now,
      id,
    ],
  );
}

/**
 * Delete upcoming/due payments for a commitment (for edit regeneration).
 * Only deletes where status IN ('upcoming', 'due') — preserves paid/skipped.
 */
export async function deleteUnpaidPaymentsByCommitment(
  db: SQLiteDatabase,
  commitmentId: string,
): Promise<void> {
  await db.runAsync(
    `DELETE FROM commitment_payments
     WHERE commitment_id = ? AND status IN ('upcoming', 'due')`,
    [commitmentId],
  );
}

/** Get the most recent paid payment for a commitment (for account pre-fill). */
export async function getLastPaidPayment(
  db: SQLiteDatabase,
  commitmentId: string,
): Promise<CommitmentPayment | null> {
  const rows = await db.getAllAsync<CommitmentPayment>(
    `SELECT * FROM commitment_payments
     WHERE commitment_id = ? AND status = 'paid'
     ORDER BY paid_date DESC
     LIMIT 1`,
    [commitmentId],
  );
  return rows[0] ?? null;
}

/** Count of paid payments for after_count auto-deactivation. */
export async function getPaidCountByCommitment(
  db: SQLiteDatabase,
  commitmentId: string,
): Promise<number> {
  const rows = await db.getAllAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM commitment_payments
     WHERE commitment_id = ? AND status = 'paid'`,
    [commitmentId],
  );
  return rows[0]?.count ?? 0;
}

/** Get all existing due dates for a commitment (for idempotent generation). */
export async function getExistingDueDates(
  db: SQLiteDatabase,
  commitmentId: string,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ due_date: string }>(
    'SELECT due_date FROM commitment_payments WHERE commitment_id = ?',
    [commitmentId],
  );
  return rows.map((r) => r.due_date);
}

export interface MarkAsPaidDetails {
  amount_paid: number;
  account_id: string;
  paid_date: string;
  exchange_rate_snapshot?: number;
  notes?: string;
}

/**
 * Atomic markAsPaid operation.
 * Within a single DB transaction:
 *   1. UPDATE commitment_payments: status='paid', paid_date, amount_paid, account_id, exchange_rate_snapshot, notes, updated_at
 *   2. INSERT into transactions (full Transaction row including commitment_payment_id)
 *   3. UPDATE accounts: deduct balance (use tx.amount for native face-value)
 *   4. UPDATE commitment_payments: set transaction_id = tx.id
 */
export async function markCommitmentAsPaid(
  db: SQLiteDatabase,
  paymentId: string,
  details: MarkAsPaidDetails,
  tx: Transaction,
  accountDelta: AccountDelta,
): Promise<void> {
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // 1. Mark payment as paid
    const paymentResult = await db.runAsync(
      `UPDATE commitment_payments SET
        status = 'paid',
        paid_date = ?,
        amount_paid = ?,
        account_id = ?,
        exchange_rate_snapshot = ?,
        notes = ?,
        updated_at = ?
       WHERE id = ?
         AND status <> 'paid'
         AND transaction_id IS NULL`,
      [
        details.paid_date,
        details.amount_paid,
        details.account_id,
        details.exchange_rate_snapshot ?? null,
        details.notes ?? null,
        now,
        paymentId,
      ],
    );
    if (paymentResult.changes !== 1) {
      const existing = await getPaymentById(db, paymentId);
      if (existing?.status === CommitmentPaymentStatus.Paid && existing.transaction_id !== null) {
        return;
      }
      if (!existing) throw new Error(`Commitment payment not found: ${paymentId}`);
      throw new Error(`Commitment payment cannot be marked as paid: ${paymentId}`);
    }

    // 2. Insert the transaction row
    if ((await insertTransactionRow(db, tx)) !== 1) {
      throw new Error(`Commitment transaction was not inserted: ${tx.id}`);
    }

    // 3. Apply the account-type-aware native-currency effect.
    await applyAccountDelta(db, accountDelta, now);

    // 4. Link the transaction back to the payment
    const linkResult = await db.runAsync(
      'UPDATE commitment_payments SET transaction_id = ?, updated_at = ? WHERE id = ?',
      [tx.id, now, paymentId],
    );
    if (linkResult.changes !== 1) throw new Error(`Commitment payment not found: ${paymentId}`);
  });
}
