import { create } from 'zustand';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { toLocalDateString } from '@/utils/format_date';
import { currentYearMonth } from '@/utils/year_month';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { CommitmentMonthAggregate } from '../domain/commitment_month_totals';
import { isPaidPayment, isSkippedPayment, resolvePaymentState } from '../domain/payment_state';
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
  today: string | undefined;
  loading: boolean;
  loadError: boolean;
  generation: number;
  monthAggregate: { key: string; aggregate: CommitmentMonthAggregate } | undefined;
  /** The key whose latest aggregate load failed; a success for that key clears it. */
  monthAggregateErrorKey: string | undefined;
}

type CommitmentStore = CommitmentStoreState & {
  ensureHousekeepingCurrent(now?: Date): Promise<void>;
  loadMonthSnapshot(yearMonth: string, now?: Date): Promise<void>;
  /** Never rejects: a failure sets `monthAggregateErrorKey` and keeps the held slot. */
  loadMonthAggregate(yearMonth: string, accountId: string | undefined, now?: Date): Promise<void>;
  setSelectedMonth(yearMonth: string): Promise<void>;

  addCommitment(data: NewCommitmentInput): Promise<void>;
  updateCommitment(id: string, data: UpdateCommitmentInput): Promise<void>;
  deactivateCommitment(id: string): Promise<void>;
  markAsPaid(paymentId: string, details: PaymentDetails): Promise<void>;
  skipPayment(paymentId: string, now?: Date): Promise<void>;
  undoSkip(paymentId: string, now?: Date): Promise<void>;

  getOverdue(): CommitmentPayment[];
  getDueToday(): CommitmentPayment[];
  getUpcoming(): CommitmentPayment[];
  getPaid(): CommitmentPayment[];
  getSkipped(): CommitmentPayment[];

  reset(): void;
};

export function monthAggregateKey(yearMonth: string, accountId: string | undefined): string {
  return `${yearMonth}|${accountId ?? ''}`;
}

function initialState(generation = 0): CommitmentStoreState {
  return {
    commitments: [],
    payments: [],
    transitioningPaymentIds: [],
    selectedMonth: currentYearMonth(),
    commitmentsLoaded: false,
    paymentsLoaded: false,
    loadedMonth: undefined,
    today: undefined,
    loading: false,
    loadError: false,
    generation,
    monthAggregate: undefined,
    monthAggregateErrorKey: undefined,
  };
}

export function createCommitmentStore(
  repo: ICommitmentRepository,
  announceTransactionWrite: () => void = () =>
    useTransactionStore.getState().announceExternalWrite(),
) {
  let dataGeneration = 0;
  let lastSuccessfulHousekeepingKey: string | undefined;
  let latestHousekeepingRequest = 0;
  let latestHousekeepingKey: string | undefined;
  let latestSnapshotRequest = 0;
  let latestRequestedMonth: string | undefined;
  let latestAggregateRequest = 0;
  let latestAggregateScope: { accountId: string | undefined } | undefined;
  const inFlightHousekeeping = new Map<string, Promise<void>>();
  const inFlightSnapshots = new Map<string, Promise<CommitmentMonthSnapshot>>();
  const inFlightAggregates = new Map<string, Promise<CommitmentMonthAggregate>>();

  const getHousekeepingRequest = (key: string, now: Date) => {
    const existing = inFlightHousekeeping.get(key);
    if (existing) return existing;
    const request = repo.runHousekeeping(now).finally(() => {
      if (inFlightHousekeeping.get(key) === request) inFlightHousekeeping.delete(key);
    });
    inFlightHousekeeping.set(key, request);
    return request;
  };

  const getSnapshotRequest = (month: string, today: string, generation: number) => {
    const key = `${month}:${today}:${generation}`;
    const existing = inFlightSnapshots.get(key);
    if (existing) return existing;
    const request = repo.getMonthSnapshot(month, today).finally(() => {
      if (inFlightSnapshots.get(key) === request) inFlightSnapshots.delete(key);
    });
    inFlightSnapshots.set(key, request);
    return request;
  };

  const getAggregateRequest = (
    yearMonth: string,
    accountId: string | undefined,
    today: string,
    generation: number,
  ) => {
    const key = `${monthAggregateKey(yearMonth, accountId)}:${today}:${generation}`;
    const existing = inFlightAggregates.get(key);
    if (existing) return existing;
    const request = repo.getMonthAggregate(yearMonth, today, accountId).finally(() => {
      if (inFlightAggregates.get(key) === request) inFlightAggregates.delete(key);
    });
    inFlightAggregates.set(key, request);
    return request;
  };

  return createMoneyAppSelectors(
    create<CommitmentStore>((set, get) => {
      const invalidateData = () => {
        dataGeneration += 1;
        set({ generation: dataGeneration });
      };

      const reloadMonthAggregate = () => {
        if (latestAggregateScope === undefined) return;
        void get().loadMonthAggregate(get().selectedMonth, latestAggregateScope.accountId);
      };

      const revalidateAfterMutation = () => {
        const month = get().selectedMonth;
        void get()
          .loadMonthSnapshot(month)
          .catch((error: unknown) =>
            console.error('[commitmentStore] revalidation failed:', error),
          );
        reloadMonthAggregate();
      };

      const beginPaymentTransition = (paymentId: string) => {
        if (get().transitioningPaymentIds.includes(paymentId)) {
          throw new Error(`Payment transition already in progress: ${paymentId}`);
        }
        set((state) => ({
          transitioningPaymentIds: [...state.transitioningPaymentIds, paymentId],
        }));
      };

      const paymentsInState = (status: CommitmentPaymentStatus) => {
        const { payments, today } = get();
        if (today === undefined) return [];
        return payments.filter((payment) => resolvePaymentState(payment, today) === status);
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

        loadMonthSnapshot: async (yearMonth, now = new Date()) => {
          const requestId = ++latestSnapshotRequest;
          latestRequestedMonth = yearMonth;
          const generation = dataGeneration;
          const today = toLocalDateString(now);
          set({ loading: true, loadError: false });

          try {
            await get().ensureHousekeepingCurrent(now);
            if (
              requestId !== latestSnapshotRequest ||
              yearMonth !== latestRequestedMonth ||
              generation !== dataGeneration
            ) {
              return;
            }

            const snapshot = await getSnapshotRequest(yearMonth, today, generation);
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

        loadMonthAggregate: async (yearMonth, accountId, now = new Date()) => {
          const requestId = ++latestAggregateRequest;
          latestAggregateScope = { accountId };
          const key = monthAggregateKey(yearMonth, accountId);
          const generation = dataGeneration;
          const today = toLocalDateString(now);

          try {
            await get().ensureHousekeepingCurrent(now);
            if (requestId !== latestAggregateRequest) return;

            const aggregate = await getAggregateRequest(yearMonth, accountId, today, generation);
            if (requestId !== latestAggregateRequest) return;
            set((state) => ({
              monthAggregate: { key, aggregate },
              monthAggregateErrorKey:
                state.monthAggregateErrorKey === key ? undefined : state.monthAggregateErrorKey,
            }));
          } catch (error) {
            console.error('[commitmentStore] loadMonthAggregate failed:', error);
            if (requestId === latestAggregateRequest) set({ monthAggregateErrorKey: key });
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
            invalidateData();
            reloadMonthAggregate();
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
            const amounts = await repo.markAsPaid(paymentId, details);
            announceTransactionWrite();
            const updatedAt = new Date().toISOString();
            set((state) => ({
              payments: state.payments.map((candidate) =>
                candidate.id === paymentId
                  ? {
                      ...candidate,
                      paid_date: details.paid_date,
                      skipped_date: null,
                      amount_paid: amounts.paymentAmount,
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

        skipPayment: async (paymentId, now = new Date()) => {
          beginPaymentTransition(paymentId);
          try {
            const skippedDate = toLocalDateString(now);
            const updatedAt = now.toISOString();
            await repo.markAsSkipped(paymentId, skippedDate, updatedAt);
            set((state) => ({
              payments: state.payments.map((candidate) =>
                candidate.id === paymentId
                  ? {
                      ...candidate,
                      skipped_date: skippedDate,
                      updated_at: updatedAt,
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

        undoSkip: async (paymentId, now = new Date()) => {
          beginPaymentTransition(paymentId);
          try {
            const updatedAt = now.toISOString();
            await repo.undoSkip(paymentId, toLocalDateString(now), updatedAt);
            set((state) => ({
              payments: state.payments.map((candidate) =>
                candidate.id === paymentId
                  ? { ...candidate, skipped_date: null, updated_at: updatedAt }
                  : candidate,
              ),
            }));
            invalidateData();
            revalidateAfterMutation();
          } catch (error) {
            console.error('[commitmentStore] undoSkip failed:', error);
            throw error;
          } finally {
            endPaymentTransition(paymentId);
          }
        },

        getOverdue: () => paymentsInState(CommitmentPaymentStatus.Overdue),

        getDueToday: () => paymentsInState(CommitmentPaymentStatus.Due),

        getUpcoming: () => paymentsInState(CommitmentPaymentStatus.Upcoming),

        getPaid: () => get().payments.filter(isPaidPayment),

        getSkipped: () => get().payments.filter(isSkippedPayment),

        reset: () => {
          dataGeneration += 1;
          lastSuccessfulHousekeepingKey = undefined;
          latestHousekeepingRequest += 1;
          latestHousekeepingKey = undefined;
          latestSnapshotRequest += 1;
          latestRequestedMonth = undefined;
          latestAggregateRequest += 1;
          latestAggregateScope = undefined;
          inFlightHousekeeping.clear();
          inFlightSnapshots.clear();
          inFlightAggregates.clear();
          set(initialState(dataGeneration));
        },
      };
    }),
  );
}

export const useCommitmentStore = createCommitmentStore(new CommitmentRepository());
