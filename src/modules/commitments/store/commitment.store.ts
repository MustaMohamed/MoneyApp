import { batch, signal, type ReadonlySignal } from '@preact/signals-react';
import uuid from 'react-native-uuid';

import { CommitmentPaymentStatus, DurationType } from '@/constants/enums';
import { computeDueDates } from '@/utils/compute_due_dates';

import type { Commitment } from '../entities/commitment.entity';
import type { CommitmentPayment } from '../entities/commitment_payment.entity';
import {
  CommitmentRepository,
  type ICommitmentRepository,
  type NewCommitmentInput,
  type UpdateCommitmentInput,
  type PaymentDetails,
} from '../repositories/commitment.repository';

export type {
  Commitment,
  CommitmentPayment,
  NewCommitmentInput,
  UpdateCommitmentInput,
  PaymentDetails,
};

const today = () => new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
const currentMonth = () => new Date().toISOString().slice(0, 7); // 'YYYY-MM'

function makePayments(commitment: Commitment, dueDates: string[]): CommitmentPayment[] {
  const now = new Date().toISOString();
  const todayStr = now.slice(0, 10);
  return dueDates.map((dueDate) => ({
    id: String(uuid.v4()),
    commitment_id: commitment.id,
    due_date: dueDate,
    paid_date: null,
    skipped_date: null,
    amount_due: commitment.amount,
    amount_paid: null,
    currency: commitment.currency,
    exchange_rate_snapshot: null,
    account_id: commitment.account_id,
    transaction_id: null,
    status:
      dueDate < todayStr
        ? CommitmentPaymentStatus.Overdue
        : dueDate === todayStr
          ? CommitmentPaymentStatus.Due
          : CommitmentPaymentStatus.Upcoming,
    notes: null,
    created_at: now,
    updated_at: now,
  }));
}

type CommitmentSignalState = {
  commitments: ReadonlySignal<Commitment[]>;
  payments: ReadonlySignal<CommitmentPayment[]>;
  selectedMonth: ReadonlySignal<string>;
  commitmentsLoaded: ReadonlySignal<boolean>;
  paymentsLoaded: ReadonlySignal<boolean>;
};

export class CommitmentStore {
  private readonly commitments = signal<Commitment[]>([]);
  private readonly payments = signal<CommitmentPayment[]>([]);
  private readonly selectedMonth = signal(currentMonth());
  private readonly commitmentsLoaded = signal(false);
  private readonly paymentsLoaded = signal(false);

  readonly state: CommitmentSignalState = {
    commitments: this.commitments,
    payments: this.payments,
    selectedMonth: this.selectedMonth,
    commitmentsLoaded: this.commitmentsLoaded,
    paymentsLoaded: this.paymentsLoaded,
  };

  private paymentRequestId = 0;

  constructor(private readonly repo: ICommitmentRepository) {}

  loadCommitments = async (): Promise<void> => {
    try {
      const commitments = await this.repo.getAll();
      batch(() => {
        this.commitments.value = commitments;
        this.commitmentsLoaded.value = true;
      });
    } catch (err) {
      console.error('[commitmentStore] loadCommitments failed:', err);
      throw err;
    }
  };

  loadPaymentsForMonth = async (yearMonth: string): Promise<void> => {
    const requestId = ++this.paymentRequestId;
    batch(() => {
      if (yearMonth !== this.state.selectedMonth.value) {
        this.payments.value = [];
      }
      this.paymentsLoaded.value = false;
    });

    try {
      const payments = await this.repo.getPaymentsForMonth(yearMonth);
      if (requestId !== this.paymentRequestId) return;
      batch(() => {
        this.payments.value = payments;
        this.paymentsLoaded.value = true;
      });
    } catch (err) {
      if (requestId !== this.paymentRequestId) return;
      console.error('[commitmentStore] loadPaymentsForMonth failed:', err);
      throw err;
    }
  };

  setSelectedMonth = async (yearMonth: string): Promise<void> => {
    const previousMonth = this.state.selectedMonth.value;
    batch(() => {
      this.selectedMonth.value = yearMonth;
      if (yearMonth !== previousMonth) {
        this.payments.value = [];
      }
      this.paymentsLoaded.value = false;
    });
    await this.loadPaymentsForMonth(yearMonth);
  };

  addCommitment = async (data: NewCommitmentInput): Promise<void> => {
    try {
      await this.repo.add(data);
      await this.loadCommitments();
    } catch (err) {
      console.error('[commitmentStore] addCommitment failed:', err);
      throw err;
    }
  };

  updateCommitment = async (id: string, data: UpdateCommitmentInput): Promise<void> => {
    try {
      await this.repo.update(id, data);
      await this.regeneratePayments(id);
      await this.loadCommitments();
      await this.loadPaymentsForMonth(this.state.selectedMonth.value);
    } catch (err) {
      console.error('[commitmentStore] updateCommitment failed:', err);
      throw err;
    }
  };

  deactivateCommitment = async (id: string): Promise<void> => {
    try {
      await this.repo.deactivate(id);
      await this.loadCommitments();
      await this.loadPaymentsForMonth(this.state.selectedMonth.value);
    } catch (err) {
      console.error('[commitmentStore] deactivateCommitment failed:', err);
      throw err;
    }
  };

  markAsPaid = async (paymentId: string, details: PaymentDetails): Promise<void> => {
    try {
      const payment = this.state.payments.value.find((p) => p.id === paymentId);
      const commitment = payment
        ? this.state.commitments.value.find((c) => c.id === payment.commitment_id)
        : undefined;
      if (!commitment) throw new Error(`Commitment not found for payment ${paymentId}`);
      await this.repo.markAsPaid(paymentId, details, commitment);
      await this.loadPaymentsForMonth(this.state.selectedMonth.value);
      await this.checkAndDeactivateExpired();
    } catch (err) {
      console.error('[commitmentStore] markAsPaid failed:', err);
      throw err;
    }
  };

  skipPayment = async (paymentId: string): Promise<void> => {
    try {
      await this.repo.markAsSkipped(paymentId);
      await this.loadPaymentsForMonth(this.state.selectedMonth.value);
    } catch (err) {
      console.error('[commitmentStore] skipPayment failed:', err);
      throw err;
    }
  };

  generatePayments = async (): Promise<void> => {
    try {
      for (const commitment of this.state.commitments.value) {
        const existingDates = await this.repo.getExistingDueDates(commitment.id);
        const existingSet = new Set(existingDates);
        const allDates = computeDueDates({
          startDate: commitment.start_date,
          every: commitment.recurrence_every,
          period: commitment.recurrence_period,
          durationType: commitment.duration_type,
          endAfterCount: commitment.end_after_count ?? undefined,
          endDate: commitment.end_date ?? undefined,
          maxCount: 64,
        });
        const newDates = allDates.filter((d) => !existingSet.has(d));
        if (newDates.length === 0) continue;
        await this.repo.insertPayments(makePayments(commitment, newDates));
      }
    } catch (err) {
      console.error('[commitmentStore] generatePayments failed:', err);
      throw err;
    }
  };

  regeneratePayments = async (commitmentId: string): Promise<void> => {
    try {
      await this.repo.deleteUnpaidPayments(commitmentId);
      const commitment = await this.repo.getById(commitmentId);
      if (!commitment) return;
      const existingDates = await this.repo.getExistingDueDates(commitmentId);
      const existingSet = new Set(existingDates);
      const allDates = computeDueDates({
        startDate: commitment.start_date,
        every: commitment.recurrence_every,
        period: commitment.recurrence_period,
        durationType: commitment.duration_type,
        endAfterCount: commitment.end_after_count ?? undefined,
        endDate: commitment.end_date ?? undefined,
        maxCount: 64,
      });
      const newDates = allDates.filter((d) => !existingSet.has(d));
      if (newDates.length === 0) return;
      await this.repo.insertPayments(makePayments(commitment, newDates));
    } catch (err) {
      console.error('[commitmentStore] regeneratePayments failed:', err);
      throw err;
    }
  };

  checkAndDeactivateExpired = async (): Promise<void> => {
    try {
      for (const commitment of this.state.commitments.value) {
        if (!commitment.is_active) continue;
        let shouldDeactivate = false;
        if (
          commitment.duration_type === DurationType.AfterCount &&
          commitment.end_after_count !== null
        ) {
          const paidCount = await this.repo.getPaidCount(commitment.id);
          if (paidCount >= commitment.end_after_count) shouldDeactivate = true;
        } else if (
          commitment.duration_type === DurationType.UntilDate &&
          commitment.end_date !== null
        ) {
          const todayStr = today();
          if (todayStr > commitment.end_date) shouldDeactivate = true;
        }
        if (shouldDeactivate) {
          await this.repo.deactivate(commitment.id);
        }
      }
      await this.loadCommitments();
    } catch (err) {
      console.error('[commitmentStore] checkAndDeactivateExpired failed:', err);
      throw err;
    }
  };

  getOverdue = (): CommitmentPayment[] =>
    this.state.payments.value.filter((p) => p.status === CommitmentPaymentStatus.Overdue);

  getDueToday = (): CommitmentPayment[] =>
    this.state.payments.value.filter((p) => p.status === CommitmentPaymentStatus.Due);

  getUpcoming = (): CommitmentPayment[] =>
    this.state.payments.value.filter((p) => p.status === CommitmentPaymentStatus.Upcoming);

  getPaid = (): CommitmentPayment[] =>
    this.state.payments.value.filter((p) => p.status === CommitmentPaymentStatus.Paid);

  getSkipped = (): CommitmentPayment[] =>
    this.state.payments.value.filter((p) => p.status === CommitmentPaymentStatus.Skipped);

  getPaidCount = (): number =>
    this.state.payments.value.filter((p) => p.status === CommitmentPaymentStatus.Paid).length;

  getTotalCount = (): number =>
    this.state.payments.value.filter((p) => p.status !== CommitmentPaymentStatus.Skipped).length;

  getTotalMonthlyCommitted = (): number =>
    this.state.commitments.value.reduce((sum, c) => {
      if (!c.is_active) return sum;
      return sum + (c.amount ?? 0);
    }, 0);

  reset = (): void => {
    this.paymentRequestId += 1;
    batch(() => {
      this.commitments.value = [];
      this.payments.value = [];
      this.selectedMonth.value = currentMonth();
      this.commitmentsLoaded.value = false;
      this.paymentsLoaded.value = false;
    });
  };
}

export function createCommitmentStore(repo: ICommitmentRepository): CommitmentStore {
  return new CommitmentStore(repo);
}

const commitmentStore = createCommitmentStore(new CommitmentRepository());

export function useCommitmentStore(): CommitmentStore {
  return commitmentStore;
}
