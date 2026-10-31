import { create } from 'zustand';

import type { CommitmentPaymentAmounts } from '@/modules/transactions/domain/transaction_amounts';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { toLocalDateString } from '@/utils/format_date';
import { currentYearMonth } from '@/utils/year_month';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { CommitmentMonthAggregate } from '../domain/commitment_month_totals';
import type { Commitment } from '../entities/commitment.entity';
import type {
  CommitmentMonthPayment,
  CommitmentPayment,
} from '../entities/commitment_payment.entity';
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
  payments: CommitmentMonthPayment[];
  transitioningPaymentIds: string[];
  selectedMonth: string;
  commitmentsLoaded: boolean;
  paymentsLoaded: boolean;
  loadedMonth: string | undefined;
  today: string | undefined;
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
  /** Reads only when the store holds no landed read of `yearMonth` for `now`'s local day and the data as it stands. */
  ensureMonthSnapshot(yearMonth: string, now?: Date): Promise<void>;
  /** The gate of `ensureMonthSnapshot` on the figures; never rejects, as `loadMonthAggregate`. */
  ensureMonthAggregate(yearMonth: string, accountId: string | undefined, now?: Date): Promise<void>;
  setSelectedMonth(yearMonth: string): Promise<void>;
  /** Opens the gates after a write this store did not make; starts no read. */
  announceExternalWrite(): void;

  addCommitment(data: NewCommitmentInput): Promise<void>;
  updateCommitment(id: string, data: UpdateCommitmentInput): Promise<void>;
  deactivateCommitment(id: string): Promise<void>;
  markAsPaid(paymentId: string, details: PaymentDetails): Promise<CommitmentPaymentAmounts>;
  skipPayment(paymentId: string, now?: Date): Promise<void>;
  undoSkip(paymentId: string, now?: Date): Promise<void>;

  reset(): void;
};

export function monthAggregateKey(yearMonth: string, accountId: string | undefined): string {
  return `${yearMonth}|${accountId ?? ''}`;
}

function shareInFlight<T>(
  map: Map<string, Promise<T>>,
  key: string,
  start: () => Promise<T>,
): Promise<T> {
  const existing = map.get(key);
  if (existing) return existing;
  const request = start().finally(() => {
    if (map.get(key) === request) map.delete(key);
  });
  map.set(key, request);
  return request;
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
  // Each holds its in-flight map's key for the last read landed, cleared as a load starts.
  let freshSnapshotKey: string | undefined;
  let freshAggregateKey: string | undefined;
  const inFlightHousekeeping = new Map<string, Promise<void>>();
  const inFlightSnapshots = new Map<string, Promise<CommitmentMonthSnapshot>>();
  const inFlightAggregates = new Map<string, Promise<CommitmentMonthAggregate>>();

  const getHousekeepingRequest = (key: string, now: Date) =>
    shareInFlight(inFlightHousekeeping, key, () => repo.runHousekeeping(now));

  const snapshotRequestKey = (month: string, today: string, generation: number) =>
    `${month}:${today}:${generation}`;

  const aggregateRequestKey = (
    yearMonth: string,
    accountId: string | undefined,
    today: string,
    generation: number,
  ) => `${monthAggregateKey(yearMonth, accountId)}:${today}:${generation}`;

  const getSnapshotRequest = (month: string, today: string, generation: number) =>
    shareInFlight(inFlightSnapshots, snapshotRequestKey(month, today, generation), () =>
      repo.getMonthSnapshot(month, today),
    );

  const getAggregateRequest = (
    yearMonth: string,
    accountId: string | undefined,
    today: string,
    generation: number,
  ) =>
    shareInFlight(
      inFlightAggregates,
      aggregateRequestKey(yearMonth, accountId, today, generation),
      () => repo.getMonthAggregate(yearMonth, today, accountId),
    );

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
          const key = `${toLocalDateString(now)}:${generation}`;
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
          freshSnapshotKey = undefined;
          if (get().loadError) set({ loadError: false });

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
            freshSnapshotKey = snapshotRequestKey(yearMonth, today, generation);
            set({
              ...snapshot,
              commitmentsLoaded: true,
              paymentsLoaded: true,
              loadError: false,
            });
          } catch (error) {
            if (
              requestId === latestSnapshotRequest &&
              yearMonth === latestRequestedMonth &&
              generation === dataGeneration
            ) {
              set({ loadError: true });
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
          freshAggregateKey = undefined;

          try {
            await get().ensureHousekeepingCurrent(now);
            if (requestId !== latestAggregateRequest || generation !== dataGeneration) return;

            const aggregate = await getAggregateRequest(yearMonth, accountId, today, generation);
            if (requestId !== latestAggregateRequest || generation !== dataGeneration) return;
            freshAggregateKey = aggregateRequestKey(yearMonth, accountId, today, generation);
            set((state) => ({
              monthAggregate: { key, aggregate },
              monthAggregateErrorKey:
                state.monthAggregateErrorKey === key ? undefined : state.monthAggregateErrorKey,
            }));
          } catch (error) {
            console.error('[commitmentStore] loadMonthAggregate failed:', error);
            if (requestId === latestAggregateRequest && generation === dataGeneration) {
              set({ monthAggregateErrorKey: key });
            }
          }
        },

        ensureMonthSnapshot: async (yearMonth, now = new Date()) => {
          const key = snapshotRequestKey(yearMonth, toLocalDateString(now), dataGeneration);
          if (freshSnapshotKey === key) return;
          await get().loadMonthSnapshot(yearMonth, now);
        },

        ensureMonthAggregate: async (yearMonth, accountId, now = new Date()) => {
          const today = toLocalDateString(now);
          const key = aggregateRequestKey(yearMonth, accountId, today, dataGeneration);
          if (freshAggregateKey === key) return;
          await get().loadMonthAggregate(yearMonth, accountId, now);
        },

        setSelectedMonth: async (yearMonth) => {
          set({ selectedMonth: yearMonth });
          await get().loadMonthSnapshot(yearMonth);
        },

        announceExternalWrite: invalidateData,

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
            const { amounts, transactionId } = await repo.markAsPaid(paymentId, details);
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
                      paid_egp_amount: amounts.egpAmount,
                      account_id: details.account_id,
                      transaction_id: transactionId,
                      exchange_rate_snapshot:
                        details.exchange_rate_snapshot ?? candidate.exchange_rate_snapshot,
                      updated_at: updatedAt,
                    }
                  : candidate,
              ),
            }));
            invalidateData();
            revalidateAfterMutation();
            return amounts;
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

        reset: () => {
          dataGeneration += 1;
          lastSuccessfulHousekeepingKey = undefined;
          latestHousekeepingRequest += 1;
          latestHousekeepingKey = undefined;
          latestSnapshotRequest += 1;
          latestRequestedMonth = undefined;
          latestAggregateRequest += 1;
          latestAggregateScope = undefined;
          freshSnapshotKey = undefined;
          freshAggregateKey = undefined;
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
