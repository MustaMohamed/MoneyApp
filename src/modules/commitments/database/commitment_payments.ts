import type { SQLiteDatabase } from 'expo-sqlite';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { applyAccountDelta } from '@/modules/accounts/database/accounts';
import { insertTransactionRow } from '@/modules/transactions/database/transactions';
import type { AccountDelta } from '@/modules/transactions/domain/transaction_policy';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

import type { CommitmentPayment } from '../entities/commitment_payment.entity';

const INSERT_PAYMENT_PREFIX = `INSERT OR IGNORE INTO commitment_payments
  (id, commitment_id, due_date, paid_date, skipped_date, amount_due, amount_paid,
   currency, exchange_rate_snapshot, account_id, transaction_id, status, notes,
   created_at, updated_at) VALUES`;
const PAYMENT_VALUE_PLACEHOLDER = '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
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
    payment.status,
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

/** `yearMonth` is `YYYY-MM`. */
export async function getPaymentsByMonth(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<CommitmentPayment[]> {
  const monthStart = `${yearMonth}-01`;

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

/** Idempotent: `INSERT OR IGNORE` skips payments whose id already exists. */
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

export async function updatePaymentStatus(
  db: SQLiteDatabase,
  id: string,
  status: CommitmentPaymentStatus,
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
  const isSkipping = status === CommitmentPaymentStatus.Skipped;
  const result = await db.runAsync(
    `UPDATE commitment_payments SET
      status = ?,
      paid_date = COALESCE(?, paid_date),
      skipped_date = COALESCE(?, skipped_date),
      amount_paid = COALESCE(?, amount_paid),
      account_id = COALESCE(?, account_id),
      exchange_rate_snapshot = COALESCE(?, exchange_rate_snapshot),
      transaction_id = COALESCE(?, transaction_id),
      updated_at = ?
     WHERE id = ?
       ${
         isSkipping ? "AND status IN ('upcoming', 'due', 'overdue') AND transaction_id IS NULL" : ''
       }`,
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
  if (isSkipping && result.changes !== 1) {
    const existing = await getPaymentById(db, id);
    if (existing?.status === CommitmentPaymentStatus.Skipped && existing.transaction_id === null) {
      return;
    }
    if (!existing) throw new Error(`Commitment payment not found: ${id}`);
    throw new Error(`Commitment payment cannot be marked as skipped: ${id}`);
  }
}

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
        status = 'paid',
        paid_date = ?,
        amount_paid = ?,
        account_id = ?,
        exchange_rate_snapshot = ?,
        notes = ?,
        updated_at = ?
       WHERE id = ?
         AND status IN ('upcoming', 'due', 'overdue')
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
      if (existing?.status === CommitmentPaymentStatus.Paid && existing.transaction_id !== null) {
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
