import { create } from 'zustand';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { currentYearMonth } from '@/utils/year_month';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { Commitment } from '../entities/commitment.entity';
import type { CommitmentPayment } from '../entities/commitment_payment.entity';
import {
  CommitmentRepository,
  type CommitmentMonthSnapshot,
  type ICommitmentRepository,
  type NewCommitmentInput,
  type PaymentDetails,
  type UpdateCommitmentInput,
} from '../repositories/commitment.repository';

export type {
  Commitment,
  CommitmentPayment,
  NewCommitmentInput,
  PaymentDetails,
  UpdateCommitmentInput,
};

interface CommitmentStoreState {
  commitments: Commitment[];
  payments: CommitmentPayment[];
  transitioningPaymentIds: string[];
  selectedMonth: string;
  commitmentsLoaded: boolean;
  paymentsLoaded: boolean;
  loadedMonth: string | undefined;
  loading: boolean;
  loadError: boolean;
  generation: number;
}

type CommitmentStore = CommitmentStoreState & {
  ensureHousekeepingCurrent(now?: Date): Promise<void>;
  loadMonthSnapshot(yearMonth: string): Promise<void>;
  setSelectedMonth(yearMonth: string): Promise<void>;

  addCommitment(data: NewCommitmentInput): Promise<void>;
  updateCommitment(id: string, data: UpdateCommitmentInput): Promise<void>;
  deactivateCommitment(id: string): Promise<void>;
  markAsPaid(paymentId: string, details: PaymentDetails): Promise<void>;
  skipPayment(paymentId: string): Promise<void>;

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

function initialState(generation = 0): CommitmentStoreState {
  return {
    commitments: [],
    payments: [],
    transitioningPaymentIds: [],
    selectedMonth: currentYearMonth(),
    commitmentsLoaded: false,
    paymentsLoaded: false,
    loadedMonth: undefined,
    loading: false,
    loadError: false,
    generation,
  };
}

export function createCommitmentStore(repo: ICommitmentRepository) {
  let dataGeneration = 0;
  let lastSuccessfulHousekeepingKey: string | undefined;
  let latestHousekeepingRequest = 0;
  let latestHousekeepingKey: string | undefined;
  let latestSnapshotRequest = 0;
  let latestRequestedMonth: string | undefined;
  const inFlightHousekeeping = new Map<string, Promise<void>>();
  const inFlightSnapshots = new Map<string, Promise<CommitmentMonthSnapshot>>();

  const getHousekeepingRequest = (key: string, now: Date) => {
    const existing = inFlightHousekeeping.get(key);
    if (existing) return existing;
    const request = repo.runHousekeeping(now).finally(() => {
      if (inFlightHousekeeping.get(key) === request) inFlightHousekeeping.delete(key);
    });
    inFlightHousekeeping.set(key, request);
    return request;
  };

  const getSnapshotRequest = (month: string, generation: number) => {
    const key = `${month}:${generation}`;
    const existing = inFlightSnapshots.get(key);
    if (existing) return existing;
    const request = repo.getMonthSnapshot(month).finally(() => {
      if (inFlightSnapshots.get(key) === request) inFlightSnapshots.delete(key);
    });
    inFlightSnapshots.set(key, request);
    return request;
  };

  return createMoneyAppSelectors(
    create<CommitmentStore>((set, get) => {
      const invalidateData = () => {
        dataGeneration += 1;
        set({ generation: dataGeneration });
      };

      const revalidateAfterMutation = () => {
        const month = get().selectedMonth;
        void get()
          .loadMonthSnapshot(month)
          .catch((error: unknown) =>
            console.error('[commitmentStore] revalidation failed:', error),
          );
      };

      const beginPaymentTransition = (paymentId: string) => {
        if (get().transitioningPaymentIds.includes(paymentId)) {
          throw new Error(`Payment transition already in progress: ${paymentId}`);
        }
        set((state) => ({
          transitioningPaymentIds: [...state.transitioningPaymentIds, paymentId],
        }));
      };

      const endPaymentTransition = (paymentId: string) => {
        set((state) => ({
          transitioningPaymentIds: state.transitioningPaymentIds.filter(
            (candidate) => candidate !== paymentId,
          ),
        }));
      };

      return {
        ...initialState(),

        ensureHousekeepingCurrent: async (now = new Date()) => {
          const generation = dataGeneration;
          const key = `${now.toISOString().slice(0, 10)}:${generation}`;
          if (lastSuccessfulHousekeepingKey === key) return;

          const requestId = ++latestHousekeepingRequest;
          latestHousekeepingKey = key;
          await getHousekeepingRequest(key, now);
          if (
            requestId === latestHousekeepingRequest &&
            key === latestHousekeepingKey &&
            generation === dataGeneration
          ) {
            lastSuccessfulHousekeepingKey = key;
          }
        },

        loadMonthSnapshot: async (yearMonth) => {
          const requestId = ++latestSnapshotRequest;
          latestRequestedMonth = yearMonth;
          const generation = dataGeneration;
          set({ loading: true, loadError: false });

          try {
            await get().ensureHousekeepingCurrent();
            if (
              requestId !== latestSnapshotRequest ||
              yearMonth !== latestRequestedMonth ||
              generation !== dataGeneration
            ) {
              return;
            }

            const snapshot = await getSnapshotRequest(yearMonth, generation);
            if (
              requestId !== latestSnapshotRequest ||
              yearMonth !== latestRequestedMonth ||
              generation !== dataGeneration
            ) {
              return;
            }
            set({
              ...snapshot,
              commitmentsLoaded: true,
              paymentsLoaded: true,
              loading: false,
              loadError: false,
            });
          } catch (error) {
            if (
              requestId === latestSnapshotRequest &&
              yearMonth === latestRequestedMonth &&
              generation === dataGeneration
            ) {
              set({ loading: false, loadError: true });
            }
            throw error;
          }
        },

        setSelectedMonth: async (yearMonth) => {
          set({ selectedMonth: yearMonth });
          await get().loadMonthSnapshot(yearMonth);
        },

        addCommitment: async (data) => {
          try {
            await repo.add(data);
            invalidateData();
            revalidateAfterMutation();
          } catch (error) {
            console.error('[commitmentStore] addCommitment failed:', error);
            throw error;
          }
        },

        updateCommitment: async (id, data) => {
          try {
            await repo.update(id, data);
            await repo.deleteUnpaidPayments(id);
            invalidateData();
            await get().loadMonthSnapshot(get().selectedMonth);
          } catch (error) {
            console.error('[commitmentStore] updateCommitment failed:', error);
            throw error;
          }
        },

        deactivateCommitment: async (id) => {
          try {
            await repo.deactivate(id);
            invalidateData();
            revalidateAfterMutation();
          } catch (error) {
            console.error('[commitmentStore] deactivateCommitment failed:', error);
            throw error;
          }
        },

        markAsPaid: async (paymentId, details) => {
          beginPaymentTransition(paymentId);
          try {
            const payment = get().payments.find((candidate) => candidate.id === paymentId);
            const commitment = payment
              ? get().commitments.find((candidate) => candidate.id === payment.commitment_id)
              : undefined;
            if (!commitment) throw new Error(`Commitment not found for payment ${paymentId}`);
            await repo.markAsPaid(paymentId, details, commitment);
            const updatedAt = new Date().toISOString();
            set((state) => ({
              payments: state.payments.map((candidate) =>
                candidate.id === paymentId
                  ? {
                      ...candidate,
                      status: CommitmentPaymentStatus.Paid,
                      paid_date: details.paid_date,
                      skipped_date: null,
                      amount_paid: details.amount_paid,
                      account_id: details.account_id,
                      exchange_rate_snapshot:
                        details.exchange_rate_snapshot ?? candidate.exchange_rate_snapshot,
                      updated_at: updatedAt,
                    }
                  : candidate,
              ),
            }));
            invalidateData();
            revalidateAfterMutation();
          } catch (error) {
            console.error('[commitmentStore] markAsPaid failed:', error);
            throw error;
          } finally {
            endPaymentTransition(paymentId);
          }
        },

        skipPayment: async (paymentId) => {
          beginPaymentTransition(paymentId);
          try {
            await repo.markAsSkipped(paymentId);
            const skippedAt = new Date().toISOString();
            set((state) => ({
              payments: state.payments.map((candidate) =>
                candidate.id === paymentId
                  ? {
                      ...candidate,
                      status: CommitmentPaymentStatus.Skipped,
                      skipped_date: skippedAt,
                      updated_at: skippedAt,
                    }
                  : candidate,
              ),
            }));
            invalidateData();
            revalidateAfterMutation();
          } catch (error) {
            console.error('[commitmentStore] skipPayment failed:', error);
            throw error;
          } finally {
            endPaymentTransition(paymentId);
          }
        },

        getOverdue: () =>
          get().payments.filter((payment) => payment.status === CommitmentPaymentStatus.Overdue),

        getDueToday: () =>
          get().payments.filter((payment) => payment.status === CommitmentPaymentStatus.Due),

        getUpcoming: () =>
          get().payments.filter((payment) => payment.status === CommitmentPaymentStatus.Upcoming),

        getPaid: () =>
          get().payments.filter((payment) => payment.status === CommitmentPaymentStatus.Paid),

        getSkipped: () =>
          get().payments.filter((payment) => payment.status === CommitmentPaymentStatus.Skipped),

        getPaidCount: () =>
          get().payments.filter((payment) => payment.status === CommitmentPaymentStatus.Paid)
            .length,

        getTotalCount: () =>
          get().payments.filter((payment) => payment.status !== CommitmentPaymentStatus.Skipped)
            .length,

        getTotalMonthlyCommitted: () =>
          get().commitments.reduce(
            (total, commitment) =>
              commitment.is_active === 1 ? total + (commitment.amount ?? 0) : total,
            0,
          ),

        reset: () => {
          dataGeneration += 1;
          lastSuccessfulHousekeepingKey = undefined;
          latestHousekeepingRequest += 1;
          latestHousekeepingKey = undefined;
          latestSnapshotRequest += 1;
          latestRequestedMonth = undefined;
          inFlightHousekeeping.clear();
          inFlightSnapshots.clear();
          set(initialState(dataGeneration));
        },
      };
    }),
  );
}

export const useCommitmentStore = createCommitmentStore(new CommitmentRepository());
