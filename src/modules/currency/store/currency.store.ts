import { makeAutoObservable, runInAction } from 'mobx';

import { Config } from '@/constants/config';
import {
  appSettingsRepository,
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

export class CurrencyStore {
  rate = INITIAL_STATE.rate;

  lastFetched: string | null = INITIAL_STATE.lastFetched;

  isManualOverride = INITIAL_STATE.isManualOverride;

  rate_updated_at: string | null = INITIAL_STATE.rate_updated_at;

  constructor(private readonly repository: IAppSettingsRepository = appSettingsRepository) {
    makeAutoObservable<CurrencyStore, 'repository'>(
      this,
      {
        repository: false,
      },
      { autoBind: true },
    );
  }

  async loadRate(): Promise<void> {
    try {
      const [rateStr, fetchedAt, manualStr, rateUpdatedAt] = await Promise.all([
        this.repository.get(RATE_KEY),
        this.repository.get(FETCHED_AT_KEY),
        this.repository.get(MANUAL_KEY),
        this.repository.get(RATE_UPDATED_AT_KEY),
      ]);

      if (rateStr !== null) {
        runInAction(() => {
          this.rate = parseFloat(rateStr);
          this.lastFetched = fetchedAt;
          this.isManualOverride = manualStr === 'true';
          this.rate_updated_at = rateUpdatedAt;
        });
      }
    } catch (err) {
      console.error('[currencyStore] loadRate failed:', err);
      throw err;
    }
  }

  async fetchRate(): Promise<void> {
    try {
      const res = await fetch(Config.currencyRateUrl);
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- API response shape validated by upstream; full Zod parse deferred
      const json = (await res.json()) as { rates: Record<string, number> };
      const rate = json.rates['EGP'];
      if (!rate) throw new Error('[currencyStore] EGP not in API response');

      const now = new Date().toISOString();
      await Promise.all([
        this.repository.set(RATE_KEY, String(rate)),
        this.repository.set(FETCHED_AT_KEY, now),
        this.repository.set(MANUAL_KEY, 'false'),
        this.repository.set(RATE_UPDATED_AT_KEY, now),
      ]);

      runInAction(() => {
        this.rate = rate;
        this.lastFetched = now;
        this.isManualOverride = false;
        this.rate_updated_at = now;
      });
    } catch (err) {
      console.error('[currencyStore] fetchRate failed:', err);
      throw err;
    }
  }

  async setManualRate(rate: number): Promise<void> {
    try {
      const now = new Date().toISOString();
      await Promise.all([
        this.repository.set(RATE_KEY, String(rate)),
        this.repository.set(MANUAL_KEY, 'true'),
        this.repository.set(RATE_UPDATED_AT_KEY, now),
      ]);

      runInAction(() => {
        this.rate = rate;
        this.isManualOverride = true;
        this.rate_updated_at = now;
      });
    } catch (err) {
      console.error('[currencyStore] setManualRate failed:', err);
      throw err;
    }
  }

  reset(): void {
    this.rate = INITIAL_STATE.rate;
    this.lastFetched = INITIAL_STATE.lastFetched;
    this.isManualOverride = INITIAL_STATE.isManualOverride;
    this.rate_updated_at = INITIAL_STATE.rate_updated_at;
  }
}

export function createCurrencyStore(repo: IAppSettingsRepository): CurrencyStore {
  return new CurrencyStore(repo);
}

export const currencyStore = new CurrencyStore(appSettingsRepository);

export function useCurrencyStore(): CurrencyStore {
  return currencyStore;
}
