import uuid from 'react-native-uuid';

import { TransactionType } from '@/constants/enums';
import { getDb } from '@/database/client';
import { getAccountByIdIncludingArchived } from '@/modules/accounts/database/accounts';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { CommitmentPaymentAmounts } from '@/modules/transactions/domain/transaction_amounts';
import { resolveCommitmentPaymentAmounts } from '@/modules/transactions/domain/transaction_amounts';
import { resolveCreateDeltas } from '@/modules/transactions/domain/transaction_policy';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { TransactionValidationError } from '@/modules/transactions/repositories/transaction.errors';
import { roundMoney } from '@/utils/money';

import {
  addPayments,
  clearPaymentSkipped,
  deleteUnpaidPaymentsByCommitment,
  getActiveCommitmentDueDates,
  getExistingDueDates,
  getLastPaidPayment,
  getPaidCountByCommitment,
  getPaymentById,
  getPaymentMonthAggregate,
  getPaymentsByCommitment,
  getPaymentsByMonth,
  getSettledCountByCommitment,
  insertPaymentRows,
  markCommitmentAsPaid,
  updatePaymentSkipped,
} from '../database/commitment_payments';
import {
  addCommitment,
  deactivateCommitment,
  deactivateExpiredCommitments,
  getCommitmentById,
  getCommitments,
  getCommitmentsForMonthSnapshot,
  reactivateCommitment,
  updateCommitment,
  type UpdateCommitmentData,
} from '../database/commitments';
import type { CommitmentMonthAggregate } from '../domain/commitment_month_totals';
import { carriedDueBound, resolveUndoSkip } from '../domain/payment_state';
import type { Commitment } from '../entities/commitment.entity';
import type { CommitmentPayment } from '../entities/commitment_payment.entity';
import { CommitmentUndoRefusedError } from './commitment.errors';
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
  today: string;
  commitments: Commitment[];
  payments: CommitmentPayment[];
}

export interface ICommitmentRepository {
  getAll(): Promise<Commitment[]>;
  getById(id: string): Promise<Commitment | undefined>;
  add(data: NewCommitmentInput): Promise<void>;
  update(id: string, data: UpdateCommitmentInput, now?: Date): Promise<void>;
  deactivate(id: string): Promise<void>;

  getPaymentsForMonth(yearMonth: string, today: string): Promise<CommitmentPayment[]>;
  getPaymentsByCommitment(commitmentId: string): Promise<CommitmentPayment[]>;
  getPaymentById(id: string): Promise<CommitmentPayment | undefined>;
  getLastPaidPayment(commitmentId: string): Promise<CommitmentPayment | undefined>;
  getPaidCount(commitmentId: string): Promise<number>;
  getExistingDueDates(commitmentId: string): Promise<string[]>;

  insertPayments(payments: CommitmentPayment[]): Promise<void>;

  markAsPaid(paymentId: string, details: PaymentDetails): Promise<CommitmentPaymentAmounts>;
  markAsSkipped(paymentId: string, skippedDate: string, updatedAt: string): Promise<void>;
  undoSkip(paymentId: string, today: string, updatedAt: string): Promise<void>;
  runHousekeeping(now: Date): Promise<void>;
  getMonthSnapshot(yearMonth: string, today: string): Promise<CommitmentMonthSnapshot>;
  getMonthAggregate(
    yearMonth: string,
    today: string,
    accountId?: string,
  ): Promise<CommitmentMonthAggregate>;
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

  async update(id: string, data: UpdateCommitmentInput, now: Date = new Date()): Promise<void> {
    const input = { ...data, amount: roundMoney(data.amount) };
    const db = await getDb();
    const updateData: UpdateCommitmentData = { ...input };
    await db.withExclusiveTransactionAsync(async (transactionDb) => {
      await updateCommitment(transactionDb, id, updateData);
      await deleteUnpaidPaymentsByCommitment(transactionDb, id);
      const commitment = await getCommitmentById(transactionDb, id);
      if (!commitment) throw new Error(`Commitment not found: ${id}`);
      const existing = await getExistingDueDates(transactionDb, id);
      const payments = planMissingCommitmentPayments({
        commitments: [commitment],
        dueDates: existing.map((due_date) => ({ commitment_id: id, due_date })),
        now,
        createId: () => String(uuid.v4()),
      });
      await insertPaymentRows(transactionDb, payments);
    });
  }

  async deactivate(id: string): Promise<void> {
    const db = await getDb();
    await db.withExclusiveTransactionAsync(async (transactionDb) => {
      await deactivateCommitment(transactionDb, id);
      await deleteUnpaidPaymentsByCommitment(transactionDb, id);
    });
  }

  async getPaymentsForMonth(yearMonth: string, today: string): Promise<CommitmentPayment[]> {
    const db = await getDb();
    return getPaymentsByMonth(db, yearMonth, carriedDueBound(yearMonth, today));
  }

  async getMonthAggregate(
    yearMonth: string,
    today: string,
    accountId?: string,
  ): Promise<CommitmentMonthAggregate> {
    const db = await getDb();
    const carriedBefore = carriedDueBound(yearMonth, today);
    return getPaymentMonthAggregate(db, {
      yearMonth,
      today,
      carriedBefore,
      ...(accountId === undefined ? {} : { accountId }),
    });
  }

  async getMonthSnapshot(yearMonth: string, today: string): Promise<CommitmentMonthSnapshot> {
    const db = await getDb();
    const carriedBefore = carriedDueBound(yearMonth, today);
    const commitments = await getCommitmentsForMonthSnapshot(db, yearMonth, carriedBefore);
    const payments = await getPaymentsByMonth(db, yearMonth, carriedBefore);
    return { loadedMonth: yearMonth, today, commitments, payments };
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

  async markAsPaid(paymentId: string, details: PaymentDetails): Promise<CommitmentPaymentAmounts> {
    const db = await getDb();
    const payment = await getPaymentById(db, paymentId);
    if (!payment) throw new Error(`Commitment payment not found: ${paymentId}`);
    const commitment = await getCommitmentById(db, payment.commitment_id);
    if (!commitment) throw new Error(`Commitment not found: ${payment.commitment_id}`);
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
    // Persist the resolver's rounded amount, not the raw `details.amount_paid`.
    const paidDetails = { ...details, amount_paid: amounts.paymentAmount };
    await markCommitmentAsPaid(db, paymentId, paidDetails, tx, accountDelta);
    return amounts;
  }

  async markAsSkipped(paymentId: string, skippedDate: string, updatedAt: string): Promise<void> {
    const db = await getDb();
    await updatePaymentSkipped(db, paymentId, skippedDate, updatedAt);
  }

  async undoSkip(paymentId: string, today: string, updatedAt: string): Promise<void> {
    const db = await getDb();
    await db.withExclusiveTransactionAsync(async (transactionDb) => {
      const payment = await getPaymentById(transactionDb, paymentId);
      if (!payment) throw new Error(`Commitment payment not found: ${paymentId}`);
      if (payment.paid_date !== null) {
        throw new Error(`Commitment payment cannot be unskipped: ${paymentId}`);
      }
      if (payment.skipped_date === null) return;
      const commitment = await getCommitmentById(transactionDb, payment.commitment_id);
      if (!commitment) throw new Error(`Commitment not found: ${payment.commitment_id}`);
      const settledCount = await getSettledCountByCommitment(transactionDb, commitment.id);
      const outcome = resolveUndoSkip(commitment, settledCount, today);
      if (outcome === 'refuse') throw new CommitmentUndoRefusedError(commitment.id);
      if ((await clearPaymentSkipped(transactionDb, paymentId, updatedAt)) !== 1) {
        throw new Error(`Commitment payment cannot be unskipped: ${paymentId}`);
      }
      if (outcome === 'reactivate') {
        await reactivateCommitment(transactionDb, commitment.id, updatedAt);
      }
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
