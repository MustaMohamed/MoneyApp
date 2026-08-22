import uuid from 'react-native-uuid';

import { CommitmentPaymentStatus, TransactionType } from '@/constants/enums';
import { getDb } from '@/database/client';
import { getAccountByIdIncludingArchived } from '@/modules/accounts/database/accounts';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { resolveCommitmentPaymentAmounts } from '@/modules/transactions/domain/transaction_amounts';
import { resolveCreateDeltas } from '@/modules/transactions/domain/transaction_policy';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { TransactionValidationError } from '@/modules/transactions/repositories/transaction.errors';
import { roundMoney } from '@/utils/money';

import {
  addPayments,
  deleteUnpaidPaymentsByCommitment,
  getActiveCommitmentDueDates,
  getExistingDueDates,
  getLastPaidPayment,
  getPaidCountByCommitment,
  getPaymentById,
  getPaymentsByCommitment,
  getPaymentsByMonth,
  insertPaymentRows,
  markCommitmentAsPaid,
  updatePaymentStatus,
} from '../database/commitment_payments';
import {
  addCommitment,
  deactivateCommitment,
  deactivateExpiredCommitments,
  getCommitmentById,
  getCommitments,
  getCommitmentsForMonthSnapshot,
  updateCommitment,
  type UpdateCommitmentData,
} from '../database/commitments';
import type { Commitment } from '../entities/commitment.entity';
import type { CommitmentPayment } from '../entities/commitment_payment.entity';
import { planMissingCommitmentPayments } from './commitment_housekeeping.helpers';

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

export interface CommitmentMonthSnapshot {
  loadedMonth: string;
  commitments: Commitment[];
  payments: CommitmentPayment[];
}

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
  runHousekeeping(now: Date): Promise<void>;
  getMonthSnapshot(yearMonth: string): Promise<CommitmentMonthSnapshot>;
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
    const input = { ...data, amount: roundMoney(data.amount) };
    const db = await getDb();
    const now = new Date().toISOString();
    const commitment: Commitment = {
      ...input,
      id: String(uuid.v4()),
      is_active: 1,
      created_at: now,
      updated_at: now,
    };
    await addCommitment(db, commitment);
  }

  async update(id: string, data: UpdateCommitmentInput): Promise<void> {
    const input = { ...data, amount: roundMoney(data.amount) };
    const db = await getDb();
    const updateData: UpdateCommitmentData = { ...input };
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

  async getMonthSnapshot(yearMonth: string): Promise<CommitmentMonthSnapshot> {
    const db = await getDb();
    const commitments = await getCommitmentsForMonthSnapshot(db, yearMonth);
    const payments = await getPaymentsByMonth(db, yearMonth);
    return { loadedMonth: yearMonth, commitments, payments };
  }

  async runHousekeeping(now: Date): Promise<void> {
    const db = await getDb();
    const timestamp = now.toISOString();
    const asOfDate = timestamp.slice(0, 10);
    await db.withExclusiveTransactionAsync(async (transactionDb) => {
      const commitments = await getCommitments(transactionDb);
      const dueDates = await getActiveCommitmentDueDates(transactionDb);
      const payments = planMissingCommitmentPayments({
        commitments,
        dueDates,
        now,
        createId: () => String(uuid.v4()),
      });
      await insertPaymentRows(transactionDb, payments);
      await deactivateExpiredCommitments(transactionDb, asOfDate, timestamp);
    });
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
    const clock = new Date();
    const now = clock.toISOString();
    const account = await getAccountByIdIncludingArchived(db, details.account_id);
    if (!account || account.is_archived === 1) {
      throw new TransactionValidationError('Payment account is unavailable');
    }
    const amounts = resolveCommitmentPaymentAmounts({
      amount: details.amount_paid,
      commitmentCurrency: commitment.currency,
      accountCurrency: account.currency,
      exchangeRate: details.exchange_rate_snapshot,
    });
    const tx: Transaction = {
      id: String(uuid.v4()),
      type: TransactionType.Expense,
      amount: amounts.accountNativeAmount,
      currency: amounts.accountCurrency,
      egp_amount: amounts.egpAmount,
      exchange_rate: amounts.exchangeRate,
      to_amount: null,
      minimum_payment_snapshot: null,
      revolving_balance_delta: null,
      account_id: details.account_id,
      to_account_id: null,
      category_id: commitment.category_id,
      budget_id: null,
      note: details.notes ?? null,
      transaction_date: details.paid_date,
      transaction_time: clock.toTimeString().slice(0, 8),
      commitment_payment_id: paymentId,
      installment_id: null,
      created_at: now,
      updated_at: now,
    };
    const [accountDelta] = resolveCreateDeltas({
      type: TransactionType.Expense,
      amount: tx.amount,
      egpAmount: tx.egp_amount,
      toAmount: null,
      minimumPaymentSnapshot: null,
      source: toAccountSnapshot(account),
    });
    // The resolver's rounded return, not the raw `details.amount_paid` — see
    // the invariant note at commitment_payments.ts's amount_paid write.
    const paidDetails = { ...details, amount_paid: amounts.paymentAmount };
    await markCommitmentAsPaid(db, paymentId, paidDetails, tx, accountDelta);
  }

  async markAsSkipped(paymentId: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await updatePaymentStatus(db, paymentId, CommitmentPaymentStatus.Skipped, {
      skipped_date: now,
    });
  }
}

function toAccountSnapshot(account: Account) {
  return {
    id: account.id,
    type: account.type,
    currency: account.currency,
    currentBalance: account.current_balance,
    revolvingBalance: account.revolving_balance,
    minimumPayment: account.minimum_payment,
  };
}

export const commitmentRepository = new CommitmentRepository();
