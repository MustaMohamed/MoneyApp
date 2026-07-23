import type { SQLiteDatabase } from 'expo-sqlite';

import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';

import type { Commitment } from '../entities/commitment.entity';

export async function getCommitments(db: SQLiteDatabase): Promise<Commitment[]> {
  return db.getAllAsync<Commitment>(
    'SELECT * FROM commitments WHERE is_active = 1 ORDER BY created_at DESC',
  );
}

export async function getCommitmentById(
  db: SQLiteDatabase,
  id: string,
): Promise<Commitment | null> {
  const rows = await db.getAllAsync<Commitment>('SELECT * FROM commitments WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function addCommitment(db: SQLiteDatabase, commitment: Commitment): Promise<void> {
  await db.runAsync(
    `INSERT INTO commitments (id, name, amount_type, amount, currency, category_id,
      recurrence_every, recurrence_period, start_date, account_id, notes,
      duration_type, end_date, end_after_count, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      commitment.id,
      commitment.name,
      commitment.amount_type,
      commitment.amount,
      commitment.currency,
      commitment.category_id,
      commitment.recurrence_every,
      commitment.recurrence_period,
      commitment.start_date,
      commitment.account_id,
      commitment.notes,
      commitment.duration_type,
      commitment.end_date,
      commitment.end_after_count,
      commitment.is_active,
      commitment.created_at,
      commitment.updated_at,
    ],
  );
}

export interface UpdateCommitmentData {
  name: string;
  amount_type: AmountType;
  amount: number | null;
  currency: Currency;
  category_id: string;
  recurrence_every: number;
  recurrence_period: RecurrencePeriod;
  start_date: string;
  account_id: string | null;
  notes: string | null;
  duration_type: DurationType;
  end_date: string | null;
  end_after_count: number | null;
}

export async function updateCommitment(
  db: SQLiteDatabase,
  id: string,
  data: UpdateCommitmentData,
): Promise<void> {
  await db.runAsync(
    `UPDATE commitments SET
      name = ?, amount_type = ?, amount = ?, currency = ?, category_id = ?,
      recurrence_every = ?, recurrence_period = ?, start_date = ?, account_id = ?,
      notes = ?, duration_type = ?, end_date = ?, end_after_count = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      data.name,
      data.amount_type,
      data.amount,
      data.currency,
      data.category_id,
      data.recurrence_every,
      data.recurrence_period,
      data.start_date,
      data.account_id,
      data.notes,
      data.duration_type,
      data.end_date,
      data.end_after_count,
      new Date().toISOString(),
      id,
    ],
  );
}

export async function deactivateCommitment(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE commitments SET is_active = 0, updated_at = ? WHERE id = ?', [
    new Date().toISOString(),
    id,
  ]);
}

export async function deactivateExpiredCommitments(
  db: SQLiteDatabase,
  asOfDate: string,
  updatedAt: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE commitments
        SET is_active = 0, updated_at = ?
      WHERE is_active = 1
        AND (
          (duration_type = 'until_date' AND end_date IS NOT NULL AND end_date < ?)
          OR
          (duration_type = 'after_count' AND end_after_count IS NOT NULL
            AND (SELECT COUNT(*)
                   FROM commitment_payments INDEXED BY idx_cp_commitment_id
                  WHERE commitment_id = commitments.id
                    AND status = 'paid') >= end_after_count)
        )`,
    [updatedAt, asOfDate],
  );
}
