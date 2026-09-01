import '@/utils/zod_config';
import { useShallow } from 'zustand/react/shallow';

import { getDb, runMigrations } from '@/database/client';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useBaseCurrencyStore } from '@/modules/currency/store/base_currency.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useCommitmentStore } from '@/store/commitment.store';
import { useAppReadyStore } from '@/store/ready.store';
import { useInit } from '@/utils/use_init.hook';

function scheduleCommitmentHousekeeping() {
  queueMicrotask(() => {
    void (async () => {
      try {
        const store = useCommitmentStore.getState();
        await store.ensureHousekeepingCurrent();
      } catch (error) {
        console.warn('[layoutInit] commitment housekeeping failed:', error);
      }
    })();
  });
}

export function useAppInit() {
  const state = useAppReadyStore(useShallow(({ status, error }) => ({ status, error })));
  const loadAccounts = useAccountStore.getState().loadAccounts;
  const loadRate = useCurrencyStore.getState().loadRate;
  const loadBaseCurrency = useBaseCurrencyStore.getState().load;
  const initOnboarding = useOnboardingStore.getState().init;

  const start = async () => {
    const readyStore = useAppReadyStore.getState();
    const generation = readyStore.begin();

    try {
      const db = await getDb();
      await runMigrations(db);
      const [onboarding] = await Promise.all([
        initOnboarding(),
        loadAccounts(),
        loadRate(),
        loadBaseCurrency(),
      ]);

      if (useAppReadyStore.getState().generation !== generation) return;
      useAppReadyStore.getState().resolveReady(generation);
      if (onboarding.complete) scheduleCommitmentHousekeeping();
    } catch (error) {
      console.warn('[layoutInit] required startup failed:', error);
      useAppReadyStore.getState().rejectFatal(generation, error);
    }
  };

  useInit(start);

  return {
    state,
    retry: () => {
      void start();
    },
  } as const;
}

export const useLayoutInit = useAppInit;
