import { create } from 'zustand';

import { Config } from '@/constants/config';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { parsePersistedRate, parseRemoteRate, shouldRefreshRate } from './currency.helpers';

const RATE_KEY = 'usd_rate';
const FETCHED_AT_KEY = 'usd_rate_fetched_at';
const MANUAL_KEY = 'usd_rate_manual_override';

const RATE_UPDATED_AT_KEY = 'usd_rate_updated_at';

const INITIAL_STATE = {
  rate: 50,
  lastFetched: null as string | null,
  isManualOverride: false,
  rate_updated_at: null as string | null,
  hasLoaded: false,
};

type CurrencyStore = typeof INITIAL_STATE & {
  loadRate: () => Promise<void>;
  fetchRate: () => Promise<void>;
  refreshRateIfStale: (now?: number) => Promise<void>;
  setManualRate: (rate: number) => Promise<void>;
  reset: () => void;
};

export function createCurrencyStore(repo: IAppSettingsRepository) {
  let operationGeneration = 0;
  let persistenceQueue = Promise.resolve();
  let backgroundRefreshPromise: Promise<void> | undefined;

  const persistIfCurrent = (
    ownerGeneration: number,
    persist: () => Promise<unknown>,
  ): Promise<boolean> => {
    const queued = persistenceQueue.then(async () => {
      if (ownerGeneration !== operationGeneration) return false;

      await persist();
      return ownerGeneration === operationGeneration;
    });
    persistenceQueue = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  };

  return createMoneyAppSelectors(
    create<CurrencyStore>((set, get) => ({
      ...INITIAL_STATE,

      loadRate: async () => {
        const ownerGeneration = ++operationGeneration;
        try {
          const [rateStr, fetchedAt, manualStr, rateUpdatedAt] = await Promise.all([
            repo.get(RATE_KEY),
            repo.get(FETCHED_AT_KEY),
            repo.get(MANUAL_KEY),
            repo.get(RATE_UPDATED_AT_KEY),
          ]);
          if (ownerGeneration !== operationGeneration) return;

          const rate = parsePersistedRate(rateStr);
          set({
            ...(rate === undefined ? {} : { rate }),
            lastFetched: rate === undefined ? null : fetchedAt,
            isManualOverride: rate !== undefined && manualStr === 'true',
            rate_updated_at: rate === undefined ? null : rateUpdatedAt,
            hasLoaded: true,
          });
        } catch (err) {
          console.error('[currencyStore] loadRate failed:', err);
          throw err;
        }
      },

      fetchRate: async () => {
        const ownerGeneration = ++operationGeneration;
        try {
          const res = await fetch(Config.currencyRateUrl);
          if (!res.ok) {
            throw new Error(`[currencyStore] Rate request failed with ${res.status}`);
          }

          const rate = parseRemoteRate(await res.json());
          const now = new Date().toISOString();
          const didPersist = await persistIfCurrent(ownerGeneration, () =>
            Promise.all([
              repo.set(RATE_KEY, String(rate)),
              repo.set(FETCHED_AT_KEY, now),
              repo.set(MANUAL_KEY, 'false'),
              repo.set(RATE_UPDATED_AT_KEY, now),
            ]),
          );
          if (!didPersist || ownerGeneration !== operationGeneration) return;

          set({
            rate,
            lastFetched: now,
            isManualOverride: false,
            rate_updated_at: now,
            hasLoaded: true,
          });
        } catch (err) {
          console.error('[currencyStore] fetchRate failed:', err);
          throw err;
        }
      },

      refreshRateIfStale: (now = Date.now()) => {
        const { hasLoaded, isManualOverride, lastFetched } = get();
        if (!hasLoaded || !shouldRefreshRate({ isManualOverride, lastFetched, now })) {
          return Promise.resolve();
        }
        if (backgroundRefreshPromise) return backgroundRefreshPromise;

        const refresh = get()
          .fetchRate()
          .finally(() => {
            if (backgroundRefreshPromise === refresh) {
              backgroundRefreshPromise = undefined;
            }
          });
        backgroundRefreshPromise = refresh;
        return refresh;
      },

      setManualRate: async (rate: number) => {
        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error('[currencyStore] Manual rate must be a positive number');
        }

        const ownerGeneration = ++operationGeneration;
        try {
          const now = new Date().toISOString();
          const didPersist = await persistIfCurrent(ownerGeneration, () =>
            Promise.all([
              repo.set(RATE_KEY, String(rate)),
              repo.set(MANUAL_KEY, 'true'),
              repo.set(RATE_UPDATED_AT_KEY, now),
            ]),
          );
          if (!didPersist || ownerGeneration !== operationGeneration) return;

          set({
            rate,
            isManualOverride: true,
            rate_updated_at: now,
            hasLoaded: true,
          });
        } catch (err) {
          console.error('[currencyStore] setManualRate failed:', err);
          throw err;
        }
      },

      reset: () => {
        operationGeneration += 1;
        backgroundRefreshPromise = undefined;
        set(INITIAL_STATE);
      },
    })),
  );
}

export const useCurrencyStore = createCurrencyStore(new AppSettingsRepository());
