import { create } from 'zustand';

import { Config } from '@/constants/config';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

const RATE_KEY = 'usd_rate';
const FETCHED_AT_KEY = 'usd_rate_fetched_at';
const MANUAL_KEY = 'usd_rate_manual_override';

const RATE_UPDATED_AT_KEY = 'usd_rate_updated_at';

const INITIAL_STATE = {
  rate: 50,
  lastFetched: null as string | null,
  isManualOverride: false,
  rate_updated_at: null as string | null,
};

interface CurrencyStore {
  state: typeof INITIAL_STATE;
  loadRate: () => Promise<void>;
  fetchRate: () => Promise<void>;
  setManualRate: (rate: number) => Promise<void>;
  reset: () => void;
}

export function createCurrencyStore(repo: IAppSettingsRepository) {
  return create<CurrencyStore>((set) => ({
    state: INITIAL_STATE,

    loadRate: async () => {
      try {
        const [rateStr, fetchedAt, manualStr, rateUpdatedAt] = await Promise.all([
          repo.get(RATE_KEY),
          repo.get(FETCHED_AT_KEY),
          repo.get(MANUAL_KEY),
          repo.get(RATE_UPDATED_AT_KEY),
        ]);
        if (rateStr !== null) {
          set((s) => ({
            state: {
              ...s.state,
              rate: parseFloat(rateStr),
              lastFetched: fetchedAt,
              isManualOverride: manualStr === 'true',
              rate_updated_at: rateUpdatedAt,
            },
          }));
        }
      } catch (err) {
        console.error('[currencyStore] loadRate failed:', err);
        throw err;
      }
    },

    fetchRate: async () => {
      try {
        const res = await fetch(Config.currencyRateUrl);
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- API response shape validated by upstream; full Zod parse deferred
        const json = (await res.json()) as { rates: Record<string, number> };
        const rate = json.rates['EGP'];
        if (!rate) throw new Error('[currencyStore] EGP not in API response');
        const now = new Date().toISOString();
        await Promise.all([
          repo.set(RATE_KEY, String(rate)),
          repo.set(FETCHED_AT_KEY, now),
          repo.set(MANUAL_KEY, 'false'),
          repo.set(RATE_UPDATED_AT_KEY, now),
        ]);
        set((s) => ({
          state: {
            ...s.state,
            rate,
            lastFetched: now,
            isManualOverride: false,
            rate_updated_at: now,
          },
        }));
      } catch (err) {
        console.error('[currencyStore] fetchRate failed:', err);
        throw err;
      }
    },

    setManualRate: async (rate: number) => {
      try {
        const now = new Date().toISOString();
        await Promise.all([
          repo.set(RATE_KEY, String(rate)),
          repo.set(MANUAL_KEY, 'true'),
          repo.set(RATE_UPDATED_AT_KEY, now),
        ]);
        set((s) => ({ state: { ...s.state, rate, isManualOverride: true, rate_updated_at: now } }));
      } catch (err) {
        console.error('[currencyStore] setManualRate failed:', err);
        throw err;
      }
    },

    reset: () => set({ state: INITIAL_STATE }),
  }));
}

export const useCurrencyStore = createCurrencyStore(new AppSettingsRepository());
