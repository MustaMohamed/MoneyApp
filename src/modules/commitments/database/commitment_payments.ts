import type { SQLiteDatabase } from 'expo-sqlite';

import { applyAccountDelta } from '@/modules/accounts/database/accounts';
import { insertTransactionRow } from '@/modules/transactions/database/transactions';
import type { AccountDelta } from '@/modules/transactions/domain/transaction_policy';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

import type { CommitmentPayment } from '../entities/commitment_payment.entity';
import { paidPaymentSql, settledPaymentSql, unpaidPaymentSql } from './payment_state_sql';

const INSERT_PAYMENT_PREFIX = `INSERT OR IGNORE INTO commitment_payments
  (id, commitment_id, due_date, paid_date, skipped_date, amount_due, amount_paid,
   currency, exchange_rate_snapshot, account_id, transaction_id, notes,
   created_at, updated_at) VALUES`;
const PAYMENT_VALUE_PLACEHOLDER = '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
const PAYMENT_INSERT_CHUNK_SIZE = 60;

function paymentInsertParams(payment: CommitmentPayment) {
  return [
    payment.id,
    payment.commitment_id,
    payment.due_date,
    payment.paid_date,
    payment.skipped_date,
    payment.amount_due,
    payment.amount_paid,
    payment.currency,
    payment.exchange_rate_snapshot,
    payment.account_id,
    payment.transaction_id,
    payment.notes,
    payment.created_at,
    payment.updated_at,
  ];
}

export interface ActiveCommitmentDueDate {
  commitment_id: string;
  due_date: string;
}

export function getActiveCommitmentDueDates(
  db: SQLiteDatabase,
): Promise<ActiveCommitmentDueDate[]> {
  return db.getAllAsync<ActiveCommitmentDueDate>(
    `SELECT payment.commitment_id, payment.due_date
       FROM commitment_payments payment
       JOIN commitments commitment ON commitment.id = payment.commitment_id
         AND commitment.is_active = 1
      ORDER BY payment.commitment_id, payment.due_date`,
  );
}

/** `yearMonth` is `YYYY-MM`: the month's rows plus the unpaid rows due before `carriedBefore`. */
export async function getPaymentsByMonth(
  db: SQLiteDatabase,
  yearMonth: string,
  carriedBefore: string,
): Promise<CommitmentPayment[]> {
  const monthStart = `${yearMonth}-01`;

  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  return db.getAllAsync<CommitmentPayment>(
    `SELECT * FROM commitment_payments
      WHERE due_date >= ? AND due_date < ?
     UNION ALL
     SELECT * FROM commitment_payments
      WHERE due_date < ? AND ${unpaidPaymentSql()}
     ORDER BY due_date ASC, id ASC`,
    [monthStart, nextMonthStr, carriedBefore],
  );
}

export async function getPaymentsByCommitment(
  db: SQLiteDatabase,
  commitmentId: string,
): Promise<CommitmentPayment[]> {
  return db.getAllAsync<CommitmentPayment>(
    'SELECT * FROM commitment_payments WHERE commitment_id = ? ORDER BY due_date ASC',
    [commitmentId],
  );
}

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

/** Idempotent: `INSERT OR IGNORE` skips a payment whose id or `(commitment_id, due_date)` pair already exists. */
export async function insertPaymentRows(
  db: SQLiteDatabase,
  payments: CommitmentPayment[],
): Promise<void> {
  for (let index = 0; index < payments.length; index += PAYMENT_INSERT_CHUNK_SIZE) {
    const chunk = payments.slice(index, index + PAYMENT_INSERT_CHUNK_SIZE);
    const placeholders = chunk.map(() => PAYMENT_VALUE_PLACEHOLDER).join(', ');
    await db.runAsync(
      `${INSERT_PAYMENT_PREFIX} ${placeholders}`,
      chunk.flatMap(paymentInsertParams),
    );
  }
}

export async function addPayments(
  db: SQLiteDatabase,
  payments: CommitmentPayment[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await insertPaymentRows(db, payments);
  });
}

/** `skippedDate` is the local calendar date `YYYY-MM-DD`. */
export async function updatePaymentSkipped(
  db: SQLiteDatabase,
  id: string,
  skippedDate: string,
  updatedAt: string,
): Promise<void> {
  const result = await db.runAsync(
    `UPDATE commitment_payments SET skipped_date = ?, updated_at = ?
     WHERE id = ?
       AND ${unpaidPaymentSql()}
       AND transaction_id IS NULL`,
    [skippedDate, updatedAt, id],
  );
  if (result.changes !== 1) {
    const existing = await getPaymentById(db, id);
    if (existing && existing.skipped_date !== null && existing.paid_date === null) {
      return;
    }
    if (!existing) throw new Error(`Commitment payment not found: ${id}`);
    throw new Error(`Commitment payment cannot be marked as skipped: ${id}`);
  }
}

export async function clearPaymentSkipped(
  db: SQLiteDatabase,
  id: string,
  updatedAt: string,
): Promise<number> {
  const result = await db.runAsync(
    `UPDATE commitment_payments SET skipped_date = NULL, updated_at = ?
     WHERE id = ? AND skipped_date IS NOT NULL AND paid_date IS NULL`,
    [updatedAt, id],
  );
  return result.changes;
}

export async function deleteUnpaidPaymentsByCommitment(
  db: SQLiteDatabase,
  commitmentId: string,
): Promise<void> {
  await db.runAsync(
    `DELETE FROM commitment_payments
     WHERE commitment_id = ? AND ${unpaidPaymentSql()}`,
    [commitmentId],
  );
}

// Keys on the commitments that still name `fromAccountId`, so it must run before they move.
export async function updateUnpaidPaymentsAccount(
  db: SQLiteDatabase,
  fromAccountId: string,
  toAccountId: string,
  updatedAt: string,
): Promise<number> {
  const result = await db.runAsync(
    `UPDATE commitment_payments SET account_id = ?, updated_at = ?
     WHERE commitment_id IN (SELECT id FROM commitments WHERE account_id = ? AND is_active = 1)
       AND ${unpaidPaymentSql()}`,
    [toAccountId, updatedAt, fromAccountId],
  );
  return result.changes;
}

export async function getLastPaidPayment(
  db: SQLiteDatabase,
  commitmentId: string,
): Promise<CommitmentPayment | null> {
  const rows = await db.getAllAsync<CommitmentPayment>(
    `SELECT * FROM commitment_payments
     WHERE commitment_id = ? AND ${paidPaymentSql()}
     ORDER BY paid_date DESC
     LIMIT 1`,
    [commitmentId],
  );
  return rows[0] ?? null;
}

export async function getPaidCountByCommitment(
  db: SQLiteDatabase,
  commitmentId: string,
): Promise<number> {
  const rows = await db.getAllAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM commitment_payments
     WHERE commitment_id = ? AND ${paidPaymentSql()}`,
    [commitmentId],
  );
  return rows[0]?.count ?? 0;
}

export async function getSettledCountByCommitment(
  db: SQLiteDatabase,
  commitmentId: string,
): Promise<number> {
  const rows = await db.getAllAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM commitment_payments
     WHERE commitment_id = ? AND ${settledPaymentSql()}`,
    [commitmentId],
  );
  return rows[0]?.count ?? 0;
}

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

/** One transaction: mark paid, insert the tx row, apply the account delta, link the two. */
export async function markCommitmentAsPaid(
  db: SQLiteDatabase,
  paymentId: string,
  details: MarkAsPaidDetails,
  tx: Transaction,
  accountDelta: AccountDelta,
): Promise<void> {
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    const paymentResult = await db.runAsync(
      `UPDATE commitment_payments SET
        paid_date = ?,
        amount_paid = ?,
        account_id = ?,
        exchange_rate_snapshot = ?,
        notes = ?,
        updated_at = ?
       WHERE id = ?
         AND ${unpaidPaymentSql()}
         AND transaction_id IS NULL`,
      [
        details.paid_date,
        // The caller must pass the resolver's rounded amount, never the raw pay-sheet input.
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
      if (existing && existing.paid_date !== null && existing.transaction_id !== null) {
        return;
      }
      if (!existing) throw new Error(`Commitment payment not found: ${paymentId}`);
      throw new Error(`Commitment payment cannot be marked as paid: ${paymentId}`);
    }

    if ((await insertTransactionRow(db, tx)) !== 1) {
      throw new Error(`Commitment transaction was not inserted: ${tx.id}`);
    }

    await applyAccountDelta(db, accountDelta, now);

    const linkResult = await db.runAsync(
      'UPDATE commitment_payments SET transaction_id = ?, updated_at = ? WHERE id = ?',
      [tx.id, now, paymentId],
    );
    if (linkResult.changes !== 1) throw new Error(`Commitment payment not found: ${paymentId}`);
  });
}
