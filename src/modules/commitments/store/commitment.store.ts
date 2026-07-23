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
  selectedMonth: string;
  commitmentsLoaded: boolean;
  paymentsLoaded: boolean;
  loadedMonth: string | undefined;
  loading: boolean;
  loadError: boolean;
  generation: number;
}

interface LoadMonthSnapshotOptions {
  ensureHousekeeping?: boolean;
}

type CommitmentStore = CommitmentStoreState & {
  ensureHousekeepingCurrent(now?: Date): Promise<void>;
  loadMonthSnapshot(yearMonth: string, options?: LoadMonthSnapshotOptions): Promise<void>;
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

      const refreshAfterMutation = async () => {
        const month = get().selectedMonth;
        await get().ensureHousekeepingCurrent();
        await get().loadMonthSnapshot(month, { ensureHousekeeping: false });
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

        loadMonthSnapshot: async (
          yearMonth,
          { ensureHousekeeping = true }: LoadMonthSnapshotOptions = {},
        ) => {
          const requestId = ++latestSnapshotRequest;
          latestRequestedMonth = yearMonth;
          const generation = dataGeneration;
          set({ loading: true, loadError: false });

          try {
            if (ensureHousekeeping) await get().ensureHousekeepingCurrent();
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
            await refreshAfterMutation();
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
            await refreshAfterMutation();
          } catch (error) {
            console.error('[commitmentStore] updateCommitment failed:', error);
            throw error;
          }
        },

        deactivateCommitment: async (id) => {
          try {
            await repo.deactivate(id);
            invalidateData();
            await refreshAfterMutation();
          } catch (error) {
            console.error('[commitmentStore] deactivateCommitment failed:', error);
            throw error;
          }
        },

        markAsPaid: async (paymentId, details) => {
          try {
            const payment = get().payments.find((candidate) => candidate.id === paymentId);
            const commitment = payment
              ? get().commitments.find((candidate) => candidate.id === payment.commitment_id)
              : undefined;
            if (!commitment) throw new Error(`Commitment not found for payment ${paymentId}`);
            await repo.markAsPaid(paymentId, details, commitment);
            invalidateData();
            await refreshAfterMutation();
          } catch (error) {
            console.error('[commitmentStore] markAsPaid failed:', error);
            throw error;
          }
        },

        skipPayment: async (paymentId) => {
          try {
            await repo.markAsSkipped(paymentId);
            invalidateData();
            await refreshAfterMutation();
          } catch (error) {
            console.error('[commitmentStore] skipPayment failed:', error);
            throw error;
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
