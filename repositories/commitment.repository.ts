import uuid from 'react-native-uuid';

import { CommitmentPaymentStatus, TransactionType } from '@/constants/enums';
import { getDb } from '@/database/client';
import {
  addPayments,
  deleteUnpaidPaymentsByCommitment,
  getExistingDueDates,
  getLastPaidPayment,
  getPaidCountByCommitment,
  getPaymentById,
  getPaymentsByCommitment,
  getPaymentsByMonth,
  markCommitmentAsPaid,
  updatePaymentStatus,
} from '@/database/commitment_payments';
import {
  addCommitment,
  deactivateCommitment,
  getCommitmentById,
  getCommitments,
  updateCommitment,
  type UpdateCommitmentData,
} from '@/database/commitments';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import type { Transaction } from '@/database/entities/transaction.entity';

export type NewCommitmentInput = Omit<Commitment, 'id' | 'created_at' | 'updated_at' | 'is_active'>;
export type UpdateCommitmentInput = Pick<
  Commitment,
  | 'name'
  | 'amount_type'
  | 'amount'
  | 'currency'
  | 'category_id'
  | 'recurrence_every'
  | 'recurrence_period'
  | 'start_date'
  | 'account_id'
  | 'notes'
  | 'duration_type'
  | 'end_date'
  | 'end_after_count'
>;

export type PaymentDetails = {
  amount_paid: number;
  account_id: string;
  paid_date: string;
  exchange_rate_snapshot?: number;
  notes?: string;
};

export interface ICommitmentRepository {
  getAll(): Promise<Commitment[]>;
  getById(id: string): Promise<Commitment | undefined>;
  add(data: NewCommitmentInput): Promise<void>;
  update(id: string, data: UpdateCommitmentInput): Promise<void>;
  deactivate(id: string): Promise<void>;

  getPaymentsForMonth(yearMonth: string): Promise<CommitmentPayment[]>;
  getPaymentsByCommitment(commitmentId: string): Promise<CommitmentPayment[]>;
  getPaymentById(id: string): Promise<CommitmentPayment | undefined>;
  getLastPaidPayment(commitmentId: string): Promise<CommitmentPayment | undefined>;
  getPaidCount(commitmentId: string): Promise<number>;
  getExistingDueDates(commitmentId: string): Promise<string[]>;

  insertPayments(payments: CommitmentPayment[]): Promise<void>;
  deleteUnpaidPayments(commitmentId: string): Promise<void>;

  markAsPaid(paymentId: string, details: PaymentDetails, commitment: Commitment): Promise<void>;
  markAsSkipped(paymentId: string): Promise<void>;
}

export class CommitmentRepository implements ICommitmentRepository {
  async getAll(): Promise<Commitment[]> {
    const db = await getDb();
    return getCommitments(db);
  }

  async getById(id: string): Promise<Commitment | undefined> {
    const db = await getDb();
    return (await getCommitmentById(db, id)) ?? undefined;
  }

  async add(data: NewCommitmentInput): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    const commitment: Commitment = {
      ...data,
      id: String(uuid.v4()),
      is_active: 1,
      created_at: now,
      updated_at: now,
    };
    await addCommitment(db, commitment);
  }

  async update(id: string, data: UpdateCommitmentInput): Promise<void> {
    const db = await getDb();
    const updateData: UpdateCommitmentData = { ...data };
    await updateCommitment(db, id, updateData);
  }

  async deactivate(id: string): Promise<void> {
    const db = await getDb();
    await deactivateCommitment(db, id);
  }

  async getPaymentsForMonth(yearMonth: string): Promise<CommitmentPayment[]> {
    const db = await getDb();
    return getPaymentsByMonth(db, yearMonth);
  }

  async getPaymentsByCommitment(commitmentId: string): Promise<CommitmentPayment[]> {
    const db = await getDb();
    return getPaymentsByCommitment(db, commitmentId);
  }

  async getPaymentById(id: string): Promise<CommitmentPayment | undefined> {
    const db = await getDb();
    return (await getPaymentById(db, id)) ?? undefined;
  }

  async getLastPaidPayment(commitmentId: string): Promise<CommitmentPayment | undefined> {
    const db = await getDb();
    return (await getLastPaidPayment(db, commitmentId)) ?? undefined;
  }

  async getPaidCount(commitmentId: string): Promise<number> {
    const db = await getDb();
    return getPaidCountByCommitment(db, commitmentId);
  }

  async getExistingDueDates(commitmentId: string): Promise<string[]> {
    const db = await getDb();
    return getExistingDueDates(db, commitmentId);
  }

  async insertPayments(payments: CommitmentPayment[]): Promise<void> {
    const db = await getDb();
    await addPayments(db, payments);
  }

  async deleteUnpaidPayments(commitmentId: string): Promise<void> {
    const db = await getDb();
    await deleteUnpaidPaymentsByCommitment(db, commitmentId);
  }

  async markAsPaid(
    paymentId: string,
    details: PaymentDetails,
    commitment: Commitment,
  ): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    const tx: Transaction = {
      id: String(uuid.v4()),
      type: TransactionType.Expense,
      amount: details.amount_paid,
      currency: commitment.currency,
      egp_amount: details.exchange_rate_snapshot
        ? details.amount_paid * details.exchange_rate_snapshot
        : details.amount_paid,
      exchange_rate: details.exchange_rate_snapshot ?? null,
      to_amount: null,
      minimum_payment_snapshot: null,
      account_id: details.account_id,
      to_account_id: null,
      category_id: commitment.category_id,
      note: details.notes ?? null,
      transaction_date: details.paid_date,
      transaction_time: now.slice(11, 19),
      commitment_payment_id: paymentId,
      installment_id: null,
      created_at: now,
      updated_at: now,
    };
    await markCommitmentAsPaid(db, paymentId, details, tx);
  }

  async markAsSkipped(paymentId: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await updatePaymentStatus(db, paymentId, CommitmentPaymentStatus.Skipped, {
      skipped_date: now,
    });
  }
}

export const commitmentRepository = new CommitmentRepository();
