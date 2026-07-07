import uuid from 'react-native-uuid';
import { create } from 'zustand';

import { CommitmentPaymentStatus, DurationType } from '@/constants/enums';
import { computeDueDates } from '@/utils/compute_due_dates';
import { currentYearMonth } from '@/utils/year_month';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

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

interface CommitmentStoreState {
  commitments: Commitment[];
  payments: CommitmentPayment[];
  selectedMonth: string;
  commitmentsLoaded: boolean;
  paymentsLoaded: boolean;
}

type CommitmentStore = CommitmentStoreState & {
  loadCommitments(): Promise<void>;
  loadPaymentsForMonth(yearMonth: string): Promise<void>;
  setSelectedMonth(yearMonth: string): Promise<void>;

  addCommitment(data: NewCommitmentInput): Promise<void>;
  updateCommitment(id: string, data: UpdateCommitmentInput): Promise<void>;
  deactivateCommitment(id: string): Promise<void>;

  markAsPaid(paymentId: string, details: PaymentDetails): Promise<void>;
  skipPayment(paymentId: string): Promise<void>;

  generatePayments(): Promise<void>;
  regeneratePayments(commitmentId: string): Promise<void>;
  checkAndDeactivateExpired(): Promise<void>;

  getOverdue(): CommitmentPayment[];
  getDueToday(): CommitmentPayment[];
  getUpcoming(): CommitmentPayment[];
  getPaid(): CommitmentPayment[];
  getSkipped(): CommitmentPayment[];
  getPaidCount(): number;
  getTotalCount(): number;
  getTotalMonthlyCommitted(): number;

  reset(): void;
};

function initialState(): CommitmentStoreState {
  return {
    commitments: [],
    payments: [],
    selectedMonth: currentYearMonth(),
    commitmentsLoaded: false,
    paymentsLoaded: false,
  };
}

export function createCommitmentStore(repo: ICommitmentRepository) {
  let paymentRequestId = 0;

  return createMoneyAppSelectors(
    create<CommitmentStore>((set, get) => ({
      ...initialState(),

      loadCommitments: async () => {
        try {
          const commitments = await repo.getAll();
          set({ commitments, commitmentsLoaded: true });
        } catch (err) {
          console.error('[commitmentStore] loadCommitments failed:', err);
          throw err;
        }
      },

      loadPaymentsForMonth: async (yearMonth) => {
        const requestId = ++paymentRequestId;
        set((s) => ({
          payments: yearMonth === s.selectedMonth ? s.payments : [],
          paymentsLoaded: yearMonth === s.selectedMonth ? s.paymentsLoaded : false,
        }));

        try {
          const payments = await repo.getPaymentsForMonth(yearMonth);
          if (requestId !== paymentRequestId) return;
          set({ payments, paymentsLoaded: true });
        } catch (err) {
          if (requestId !== paymentRequestId) return;
          console.error('[commitmentStore] loadPaymentsForMonth failed:', err);
          throw err;
        }
      },

      setSelectedMonth: async (yearMonth) => {
        set((s) => ({
          selectedMonth: yearMonth,
          payments: yearMonth === s.selectedMonth ? s.payments : [],
          paymentsLoaded: false,
        }));
        await get().loadPaymentsForMonth(yearMonth);
      },

      addCommitment: async (data) => {
        try {
          await repo.add(data);
          await get().loadCommitments();
        } catch (err) {
          console.error('[commitmentStore] addCommitment failed:', err);
          throw err;
        }
      },

      updateCommitment: async (id, data) => {
        try {
          await repo.update(id, data);
          await get().regeneratePayments(id);
          await get().loadCommitments();
          await get().loadPaymentsForMonth(get().selectedMonth);
        } catch (err) {
          console.error('[commitmentStore] updateCommitment failed:', err);
          throw err;
        }
      },

      deactivateCommitment: async (id) => {
        try {
          await repo.deactivate(id);
          await get().loadCommitments();
          await get().loadPaymentsForMonth(get().selectedMonth);
        } catch (err) {
          console.error('[commitmentStore] deactivateCommitment failed:', err);
          throw err;
        }
      },

      markAsPaid: async (paymentId, details) => {
        try {
          const payment = get().payments.find((p) => p.id === paymentId);
          const commitment = payment
            ? get().commitments.find((c) => c.id === payment.commitment_id)
            : undefined;
          if (!commitment) throw new Error(`Commitment not found for payment ${paymentId}`);
          await repo.markAsPaid(paymentId, details, commitment);
          await get().loadPaymentsForMonth(get().selectedMonth);
          await get().checkAndDeactivateExpired();
        } catch (err) {
          console.error('[commitmentStore] markAsPaid failed:', err);
          throw err;
        }
      },

      skipPayment: async (paymentId) => {
        try {
          await repo.markAsSkipped(paymentId);
          await get().loadPaymentsForMonth(get().selectedMonth);
        } catch (err) {
          console.error('[commitmentStore] skipPayment failed:', err);
          throw err;
        }
      },

      generatePayments: async () => {
        try {
          const { commitments } = get();
          for (const commitment of commitments) {
            const existingDates = await repo.getExistingDueDates(commitment.id);
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
            await repo.insertPayments(makePayments(commitment, newDates));
          }
        } catch (err) {
          console.error('[commitmentStore] generatePayments failed:', err);
          throw err;
        }
      },

      regeneratePayments: async (commitmentId) => {
        try {
          await repo.deleteUnpaidPayments(commitmentId);
          const commitment = await repo.getById(commitmentId);
          if (!commitment) return;
          const existingDates = await repo.getExistingDueDates(commitmentId);
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
          await repo.insertPayments(makePayments(commitment, newDates));
        } catch (err) {
          console.error('[commitmentStore] regeneratePayments failed:', err);
          throw err;
        }
      },

      checkAndDeactivateExpired: async () => {
        try {
          const { commitments } = get();
          for (const commitment of commitments) {
            if (!commitment.is_active) continue;
            let shouldDeactivate = false;
            if (
              commitment.duration_type === DurationType.AfterCount &&
              commitment.end_after_count !== null
            ) {
              const paidCount = await repo.getPaidCount(commitment.id);
              if (paidCount >= commitment.end_after_count) shouldDeactivate = true;
            } else if (
              commitment.duration_type === DurationType.UntilDate &&
              commitment.end_date !== null
            ) {
              const todayStr = today();
              if (todayStr > commitment.end_date) shouldDeactivate = true;
            }
            if (shouldDeactivate) {
              await repo.deactivate(commitment.id);
            }
          }
          await get().loadCommitments();
        } catch (err) {
          console.error('[commitmentStore] checkAndDeactivateExpired failed:', err);
          throw err;
        }
      },

      getOverdue: () => get().payments.filter((p) => p.status === CommitmentPaymentStatus.Overdue),

      getDueToday: () => get().payments.filter((p) => p.status === CommitmentPaymentStatus.Due),

      getUpcoming: () =>
        get().payments.filter((p) => p.status === CommitmentPaymentStatus.Upcoming),

      getPaid: () => get().payments.filter((p) => p.status === CommitmentPaymentStatus.Paid),

      getSkipped: () => get().payments.filter((p) => p.status === CommitmentPaymentStatus.Skipped),

      getPaidCount: () =>
        get().payments.filter((p) => p.status === CommitmentPaymentStatus.Paid).length,

      getTotalCount: () =>
        get().payments.filter((p) => p.status !== CommitmentPaymentStatus.Skipped).length,

      getTotalMonthlyCommitted: () => {
        const { commitments } = get();
        return commitments.reduce((sum, c) => {
          if (!c.is_active) return sum;
          return sum + (c.amount ?? 0);
        }, 0);
      },

      reset: () => set(initialState()),
    })),
  );
}

export const useCommitmentStore = createCommitmentStore(new CommitmentRepository());
