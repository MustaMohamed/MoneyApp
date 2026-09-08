import { create } from 'zustand';

import {
  accountActivityRepository,
  type AccountActivityLoadInput,
  type AccountActivitySnapshot,
  type IAccountActivityRepository,
} from '@/modules/accounts/repositories/account_activity.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type AccountActivityStatus = 'idle' | 'initialLoading' | 'ready' | 'initialError';

interface AccountActivityStoreShape {
  snapshot: AccountActivitySnapshot | undefined;
  status: AccountActivityStatus;
  requestedKey: string | undefined;
  requestGeneration: number;
}

interface AccountActivityStoreActions {
  ensure: (input: AccountActivityLoadInput) => Promise<void>;
  retry: (input: AccountActivityLoadInput) => Promise<void>;
  reset: () => void;
}

type AccountActivityStore = AccountActivityStoreShape & AccountActivityStoreActions;

type InFlight = {
  key: string;
  generation: number;
  promise: Promise<void>;
};

const INITIAL_STATE: AccountActivityStoreShape = {
  snapshot: undefined,
  status: 'idle',
  requestedKey: undefined,
  requestGeneration: 0,
};

/** `mutationVersion` in the key: a detail still mounted through a write reloads instead of serving the stale rows. */
function freshKeyOf(input: AccountActivityLoadInput): string {
  return `${input.accountId}:${input.mutationVersion}`;
}

export function createAccountActivityStore(repository: IAccountActivityRepository) {
  let generation = 0;
  let freshKey: string | undefined;
  let inFlight: InFlight | undefined;

  return createMoneyAppSelectors(
    create<AccountActivityStore>((set, get) => {
      const startRequest = (input: AccountActivityLoadInput, force: boolean): Promise<void> => {
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

        let repositoryRequest: Promise<AccountActivitySnapshot>;
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
              console.error('[accountActivityStore] snapshot request failed:', error);
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

export const useAccountActivityStore = createAccountActivityStore(accountActivityRepository);
