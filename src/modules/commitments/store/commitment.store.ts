import { makeAutoObservable, runInAction } from 'mobx';
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

export class CommitmentStore {
  commitments: Commitment[] = [];
  payments: CommitmentPayment[] = [];
  selectedMonth = currentMonth();
  commitmentsLoaded = false;
  paymentsLoaded = false;

  private paymentRequestId = 0;

  constructor(private readonly repository: ICommitmentRepository = new CommitmentRepository()) {
    makeAutoObservable<CommitmentStore, 'repository' | 'paymentRequestId'>(
      this,
      {
        repository: false,
        paymentRequestId: false,
      },
      { autoBind: true },
    );
  }

  async loadCommitments(): Promise<void> {
    try {
      const commitments = await this.repository.getAll();
      runInAction(() => {
        this.commitments = commitments;
        this.commitmentsLoaded = true;
      });
    } catch (err) {
      console.error('[commitmentStore] loadCommitments failed:', err);
      throw err;
    }
  }

  async loadPaymentsForMonth(yearMonth: string): Promise<void> {
    const requestId = ++this.paymentRequestId;
    runInAction(() => {
      this.payments = yearMonth === this.selectedMonth ? this.payments : [];
      this.paymentsLoaded = false;
    });

    try {
      const payments = await this.repository.getPaymentsForMonth(yearMonth);
      if (requestId !== this.paymentRequestId) return;

      runInAction(() => {
        this.payments = payments;
        this.paymentsLoaded = true;
      });
    } catch (err) {
      if (requestId !== this.paymentRequestId) return;
      console.error('[commitmentStore] loadPaymentsForMonth failed:', err);
      throw err;
    }
  }

  async setSelectedMonth(yearMonth: string): Promise<void> {
    runInAction(() => {
      this.payments = yearMonth === this.selectedMonth ? this.payments : [];
      this.selectedMonth = yearMonth;
      this.paymentsLoaded = false;
    });
    await this.loadPaymentsForMonth(yearMonth);
  }

  async addCommitment(data: NewCommitmentInput): Promise<void> {
    try {
      await this.repository.add(data);
      await this.loadCommitments();
    } catch (err) {
      console.error('[commitmentStore] addCommitment failed:', err);
      throw err;
    }
  }

  async updateCommitment(id: string, data: UpdateCommitmentInput): Promise<void> {
    try {
      await this.repository.update(id, data);
      await this.regeneratePayments(id);
      await this.loadCommitments();
      await this.loadPaymentsForMonth(this.selectedMonth);
    } catch (err) {
      console.error('[commitmentStore] updateCommitment failed:', err);
      throw err;
    }
  }

  async deactivateCommitment(id: string): Promise<void> {
    try {
      await this.repository.deactivate(id);
      await this.loadCommitments();
      await this.loadPaymentsForMonth(this.selectedMonth);
    } catch (err) {
      console.error('[commitmentStore] deactivateCommitment failed:', err);
      throw err;
    }
  }

  async markAsPaid(paymentId: string, details: PaymentDetails): Promise<void> {
    try {
      const payment = this.payments.find((p) => p.id === paymentId);
      const commitment = payment
        ? this.commitments.find((c) => c.id === payment.commitment_id)
        : undefined;
      if (!commitment) throw new Error(`Commitment not found for payment ${paymentId}`);

      await this.repository.markAsPaid(paymentId, details, commitment);
      await this.loadPaymentsForMonth(this.selectedMonth);
      await this.checkAndDeactivateExpired();
    } catch (err) {
      console.error('[commitmentStore] markAsPaid failed:', err);
      throw err;
    }
  }

  async skipPayment(paymentId: string): Promise<void> {
    try {
      await this.repository.markAsSkipped(paymentId);
      await this.loadPaymentsForMonth(this.selectedMonth);
    } catch (err) {
      console.error('[commitmentStore] skipPayment failed:', err);
      throw err;
    }
  }

  async generatePayments(): Promise<void> {
    try {
      for (const commitment of this.commitments) {
        const existingDates = await this.repository.getExistingDueDates(commitment.id);
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
        const newDates = allDates.filter((dueDate) => !existingSet.has(dueDate));
        if (newDates.length === 0) continue;
        await this.repository.insertPayments(makePayments(commitment, newDates));
      }
    } catch (err) {
      console.error('[commitmentStore] generatePayments failed:', err);
      throw err;
    }
  }

  async regeneratePayments(commitmentId: string): Promise<void> {
    try {
      await this.repository.deleteUnpaidPayments(commitmentId);
      const commitment = await this.repository.getById(commitmentId);
      if (!commitment) return;

      const existingDates = await this.repository.getExistingDueDates(commitmentId);
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
      const newDates = allDates.filter((dueDate) => !existingSet.has(dueDate));
      if (newDates.length === 0) return;
      await this.repository.insertPayments(makePayments(commitment, newDates));
    } catch (err) {
      console.error('[commitmentStore] regeneratePayments failed:', err);
      throw err;
    }
  }

  async checkAndDeactivateExpired(): Promise<void> {
    try {
      for (const commitment of this.commitments) {
        if (!commitment.is_active) continue;

        let shouldDeactivate = false;
        if (
          commitment.duration_type === DurationType.AfterCount &&
          commitment.end_after_count !== null
        ) {
          const paidCount = await this.repository.getPaidCount(commitment.id);
          if (paidCount >= commitment.end_after_count) shouldDeactivate = true;
        } else if (
          commitment.duration_type === DurationType.UntilDate &&
          commitment.end_date !== null
        ) {
          const todayStr = today();
          if (todayStr > commitment.end_date) shouldDeactivate = true;
        }

        if (shouldDeactivate) {
          await this.repository.deactivate(commitment.id);
        }
      }
      await this.loadCommitments();
    } catch (err) {
      console.error('[commitmentStore] checkAndDeactivateExpired failed:', err);
      throw err;
    }
  }

  getOverdue(): CommitmentPayment[] {
    return this.payments.filter((payment) => payment.status === CommitmentPaymentStatus.Overdue);
  }

  getDueToday(): CommitmentPayment[] {
    return this.payments.filter((payment) => payment.status === CommitmentPaymentStatus.Due);
  }

  getUpcoming(): CommitmentPayment[] {
    return this.payments.filter((payment) => payment.status === CommitmentPaymentStatus.Upcoming);
  }

  getPaid(): CommitmentPayment[] {
    return this.payments.filter((payment) => payment.status === CommitmentPaymentStatus.Paid);
  }

  getSkipped(): CommitmentPayment[] {
    return this.payments.filter((payment) => payment.status === CommitmentPaymentStatus.Skipped);
  }

  getPaidCount(): number {
    return this.payments.filter((payment) => payment.status === CommitmentPaymentStatus.Paid)
      .length;
  }

  getTotalCount(): number {
    return this.payments.filter((payment) => payment.status !== CommitmentPaymentStatus.Skipped)
      .length;
  }

  getTotalMonthlyCommitted(): number {
    return this.commitments.reduce((sum, commitment) => {
      if (!commitment.is_active) return sum;
      return sum + (commitment.amount ?? 0);
    }, 0);
  }

  reset(): void {
    this.paymentRequestId += 1;
    this.commitments = [];
    this.payments = [];
    this.selectedMonth = currentMonth();
    this.commitmentsLoaded = false;
    this.paymentsLoaded = false;
  }
}

export function createCommitmentStore(repo: ICommitmentRepository): CommitmentStore {
  return new CommitmentStore(repo);
}

export const commitmentStore = new CommitmentStore(new CommitmentRepository());

export function useCommitmentStore(): CommitmentStore {
  return commitmentStore;
}
