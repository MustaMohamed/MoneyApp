import { create } from 'zustand';

import {
  dashboardRepository,
  type DashboardLoadInput,
  type DashboardSnapshot,
  type DashboardSnapshotStatus,
  type IDashboardRepository,
} from '@/modules/dashboard/repositories/dashboard.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface DashboardStoreShape {
  snapshot: DashboardSnapshot | undefined;
  status: DashboardSnapshotStatus;
  requestedKey: string | undefined;
  requestGeneration: number;
}

interface DashboardStoreActions {
  ensureSnapshot: (input: DashboardLoadInput) => Promise<void>;
  refresh: (input: DashboardLoadInput) => Promise<void>;
  retry: (input: DashboardLoadInput) => Promise<void>;
  invalidate: () => void;
  reset: () => void;
}

type DashboardStore = DashboardStoreShape & DashboardStoreActions;

type InFlight = {
  key: string;
  generation: number;
  promise: Promise<void>;
};

const INITIAL_STATE: DashboardStoreShape = {
  snapshot: undefined,
  status: 'idle',
  requestedKey: undefined,
  requestGeneration: 0,
};

export function createDashboardStore(repository: IDashboardRepository) {
  let generation = 0;
  let freshKey: string | undefined;
  let inFlight: InFlight | undefined;

  return createMoneyAppSelectors(
    create<DashboardStore>((set, get) => {
      const startRequest = (input: DashboardLoadInput, force: boolean): Promise<void> => {
        if (inFlight?.key === input.yearMonth) return inFlight.promise;

        const currentSnapshot = get().snapshot;
        if (!force && freshKey === input.yearMonth && currentSnapshot?.key === input.yearMonth) {
          return Promise.resolve();
        }

        const ownerGeneration = ++generation;
        const sameKeySnapshot =
          currentSnapshot?.key === input.yearMonth ? currentSnapshot : undefined;

        if (sameKeySnapshot) {
          set({
            status: 'refreshing',
            requestedKey: input.yearMonth,
            requestGeneration: ownerGeneration,
          });
        } else {
          set({
            snapshot: undefined,
            status: 'initialLoading',
            requestedKey: input.yearMonth,
            requestGeneration: ownerGeneration,
          });
        }

        let repositoryRequest: Promise<DashboardSnapshot>;
        try {
          repositoryRequest = Promise.resolve(repository.getSnapshot(input));
        } catch (error) {
          repositoryRequest = Promise.reject(error);
        }

        const request = repositoryRequest
          .then(
            (snapshot) => {
              if (ownerGeneration !== generation) return;
              freshKey = input.yearMonth;
              set({
                snapshot,
                status: 'ready',
                requestedKey: input.yearMonth,
                requestGeneration: ownerGeneration,
              });
            },
            (error: unknown) => {
              if (ownerGeneration !== generation) return;
              console.error('[dashboardStore] snapshot request failed:', error);
              set({
                status: sameKeySnapshot ? 'refreshErrorWithData' : 'initialError',
                requestGeneration: ownerGeneration,
              });
            },
          )
          .finally(() => {
            if (inFlight?.generation === ownerGeneration) inFlight = undefined;
          });

        inFlight = {
          key: input.yearMonth,
          generation: ownerGeneration,
          promise: request,
        };
        return request;
      };

      return {
        ...INITIAL_STATE,
        ensureSnapshot: (input) => startRequest(input, false),
        refresh: (input) => startRequest(input, true),
        retry: (input) => startRequest(input, true),
        invalidate: () => {
          generation += 1;
          freshKey = undefined;
          inFlight = undefined;
          set({ requestGeneration: generation });
        },
        reset: () => {
          generation += 1;
          freshKey = undefined;
          inFlight = undefined;
          set({ ...INITIAL_STATE, requestGeneration: generation });
        },
      };
    }),
  );
}

export const useDashboardStore = createDashboardStore(dashboardRepository);
