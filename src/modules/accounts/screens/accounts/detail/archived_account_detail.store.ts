import { create } from 'zustand';

import {
  archivedAccountDetailRepository,
  type ArchivedAccountDetailLoadInput,
  type ArchivedAccountDetailSnapshot,
  type IArchivedAccountDetailRepository,
} from '@/modules/accounts/repositories/archived_account_detail.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type ArchivedAccountDetailStatus = 'idle' | 'initialLoading' | 'ready' | 'initialError';

interface ArchivedAccountDetailStoreShape {
  snapshot: ArchivedAccountDetailSnapshot | undefined;
  status: ArchivedAccountDetailStatus;
  requestedKey: string | undefined;
  requestGeneration: number;
}

interface ArchivedAccountDetailStoreActions {
  ensure: (input: ArchivedAccountDetailLoadInput) => Promise<void>;
  retry: (input: ArchivedAccountDetailLoadInput) => Promise<void>;
  reset: () => void;
}

type ArchivedAccountDetailStore = ArchivedAccountDetailStoreShape &
  ArchivedAccountDetailStoreActions;

type InFlight = {
  key: string;
  generation: number;
  promise: Promise<void>;
};

const INITIAL_STATE: ArchivedAccountDetailStoreShape = {
  snapshot: undefined,
  status: 'idle',
  requestedKey: undefined,
  requestGeneration: 0,
};

/** `mutationVersion` in the key: a transaction write anywhere makes the next request read again. */
function freshKeyOf(input: ArchivedAccountDetailLoadInput): string {
  return `${input.accountId}:${input.mutationVersion}`;
}

export function createArchivedAccountDetailStore(repository: IArchivedAccountDetailRepository) {
  let generation = 0;
  let freshKey: string | undefined;
  let inFlight: InFlight | undefined;

  return createMoneyAppSelectors(
    create<ArchivedAccountDetailStore>((set, get) => {
      const startRequest = (
        input: ArchivedAccountDetailLoadInput,
        force: boolean,
      ): Promise<void> => {
        const key = freshKeyOf(input);
        if (inFlight?.key === key) return inFlight.promise;

        if (!force && freshKey === key && get().snapshot?.accountId === input.accountId) {
          return Promise.resolve();
        }

        const ownerGeneration = ++generation;
        set({
          snapshot: undefined,
          status: 'initialLoading',
          requestedKey: key,
          requestGeneration: ownerGeneration,
        });

        let repositoryRequest: Promise<ArchivedAccountDetailSnapshot>;
        try {
          repositoryRequest = Promise.resolve(repository.getSnapshot(input));
        } catch (error) {
          repositoryRequest = Promise.reject(error);
        }

        const request = repositoryRequest
          .then(
            (snapshot) => {
              if (ownerGeneration !== generation) return;
              freshKey = key;
              set({
                snapshot,
                status: 'ready',
                requestedKey: key,
                requestGeneration: ownerGeneration,
              });
            },
            (error: unknown) => {
              if (ownerGeneration !== generation) return;
              console.error('[archivedAccountDetailStore] snapshot request failed:', error);
              set({ status: 'initialError', requestGeneration: ownerGeneration });
            },
          )
          .finally(() => {
            if (inFlight?.generation === ownerGeneration) inFlight = undefined;
          });

        inFlight = {
          key,
          generation: ownerGeneration,
          promise: request,
        };
        return request;
      };

      return {
        ...INITIAL_STATE,
        ensure: (input) => startRequest(input, false),
        retry: (input) => startRequest(input, true),
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

export const useArchivedAccountDetailStore = createArchivedAccountDetailStore(
  archivedAccountDetailRepository,
);
