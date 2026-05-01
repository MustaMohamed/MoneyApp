import { create } from 'zustand';

import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

const RATE_KEY = 'usd_rate';
const FETCHED_AT_KEY = 'usd_rate_fetched_at';
const MANUAL_KEY = 'usd_rate_manual_override';
const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/USD';

interface CurrencyState {
  rate: number;
  lastFetched: string | null;
  isManualOverride: boolean;
  loadRate: () => Promise<void>;
  fetchRate: () => Promise<void>;
  setManualRate: (rate: number) => Promise<void>;
}

export function createCurrencyStore(repo: IAppSettingsRepository) {
  return create<CurrencyState>((set) => ({
    rate: 50,
    lastFetched: null,
    isManualOverride: false,

    loadRate: async () => {
      try {
        const [rateStr, fetchedAt, manualStr] = await Promise.all([
          repo.get(RATE_KEY),
          repo.get(FETCHED_AT_KEY),
          repo.get(MANUAL_KEY),
        ]);
        if (rateStr !== null) {
          set({
            rate: parseFloat(rateStr),
            lastFetched: fetchedAt,
            isManualOverride: manualStr === 'true',
          });
        }
      } catch (err) {
        console.error('[currencyStore] loadRate failed:', err);
        throw err;
      }
    },

    fetchRate: async () => {
      try {
        const res = await fetch(EXCHANGE_API_URL);
        const json = (await res.json()) as { rates: Record<string, number> };
        const rate = json.rates['EGP'];
        if (!rate) throw new Error('[currencyStore] EGP not in API response');
        const now = new Date().toISOString();
        await Promise.all([
          repo.set(RATE_KEY, String(rate)),
          repo.set(FETCHED_AT_KEY, now),
          repo.set(MANUAL_KEY, 'false'),
        ]);
        set({ rate, lastFetched: now, isManualOverride: false });
      } catch (err) {
        console.error('[currencyStore] fetchRate failed:', err);
        throw err;
      }
    },

    setManualRate: async (rate: number) => {
      try {
        await Promise.all([repo.set(RATE_KEY, String(rate)), repo.set(MANUAL_KEY, 'true')]);
        set({ rate, isManualOverride: true });
      } catch (err) {
        console.error('[currencyStore] setManualRate failed:', err);
        throw err;
      }
    },
  }));
}

export const useCurrencyStore = createCurrencyStore(new AppSettingsRepository());
