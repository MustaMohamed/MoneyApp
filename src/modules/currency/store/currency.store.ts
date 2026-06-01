import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

import { Config } from '@/constants/config';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

const RATE_KEY = 'usd_rate';
const FETCHED_AT_KEY = 'usd_rate_fetched_at';
const MANUAL_KEY = 'usd_rate_manual_override';
const RATE_UPDATED_AT_KEY = 'usd_rate_updated_at';

const INITIAL_RATE = 50;
const INITIAL_LAST_FETCHED: string | null = null;
const INITIAL_MANUAL_OVERRIDE = false;
const INITIAL_RATE_UPDATED_AT: string | null = null;

type CurrencySignalState = {
  rate: ReadonlySignal<number>;
  lastFetched: ReadonlySignal<string | null>;
  isManualOverride: ReadonlySignal<boolean>;
  rateUpdatedAt: ReadonlySignal<string | null>;
};

export class CurrencyStore {
  private readonly rate = signal(INITIAL_RATE);
  private readonly lastFetched = signal(INITIAL_LAST_FETCHED);
  private readonly isManualOverride = signal(INITIAL_MANUAL_OVERRIDE);
  private readonly rateUpdatedAt = signal(INITIAL_RATE_UPDATED_AT);

  readonly state: CurrencySignalState = {
    rate: this.rate,
    lastFetched: this.lastFetched,
    isManualOverride: this.isManualOverride,
    rateUpdatedAt: this.rateUpdatedAt,
  };

  constructor(private readonly repo: IAppSettingsRepository) {}

  loadRate = async (): Promise<void> => {
    try {
      const [rateStr, fetchedAt, manualStr, rateUpdatedAt] = await Promise.all([
        this.repo.get(RATE_KEY),
        this.repo.get(FETCHED_AT_KEY),
        this.repo.get(MANUAL_KEY),
        this.repo.get(RATE_UPDATED_AT_KEY),
      ]);

      if (rateStr !== null) {
        batch(() => {
          this.rate.value = parseFloat(rateStr);
          this.lastFetched.value = fetchedAt;
          this.isManualOverride.value = manualStr === 'true';
          this.rateUpdatedAt.value = rateUpdatedAt;
        });
      }
    } catch (err) {
      console.error('[currencyStore] loadRate failed:', err);
      throw err;
    }
  };

  fetchRate = async (): Promise<void> => {
    try {
      const res = await fetch(Config.currencyRateUrl);
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- API response shape validated by upstream; full Zod parse deferred
      const json = (await res.json()) as { rates: Record<string, number> };
      const rate = json.rates['EGP'];
      if (!rate) throw new Error('[currencyStore] EGP not in API response');
      const now = new Date().toISOString();
      await Promise.all([
        this.repo.set(RATE_KEY, String(rate)),
        this.repo.set(FETCHED_AT_KEY, now),
        this.repo.set(MANUAL_KEY, 'false'),
        this.repo.set(RATE_UPDATED_AT_KEY, now),
      ]);
      batch(() => {
        this.rate.value = rate;
        this.lastFetched.value = now;
        this.isManualOverride.value = false;
        this.rateUpdatedAt.value = now;
      });
    } catch (err) {
      console.error('[currencyStore] fetchRate failed:', err);
      throw err;
    }
  };

  setManualRate = async (rate: number): Promise<void> => {
    try {
      const now = new Date().toISOString();
      await Promise.all([
        this.repo.set(RATE_KEY, String(rate)),
        this.repo.set(MANUAL_KEY, 'true'),
        this.repo.set(RATE_UPDATED_AT_KEY, now),
      ]);
      batch(() => {
        this.rate.value = rate;
        this.isManualOverride.value = true;
        this.rateUpdatedAt.value = now;
      });
    } catch (err) {
      console.error('[currencyStore] setManualRate failed:', err);
      throw err;
    }
  };

  reset = (): void => {
    batch(() => {
      this.rate.value = INITIAL_RATE;
      this.lastFetched.value = INITIAL_LAST_FETCHED;
      this.isManualOverride.value = INITIAL_MANUAL_OVERRIDE;
      this.rateUpdatedAt.value = INITIAL_RATE_UPDATED_AT;
    });
  };
}

export function createCurrencyStore(repo: IAppSettingsRepository): CurrencyStore {
  return new CurrencyStore(repo);
}

const currencyStore = createCurrencyStore(new AppSettingsRepository());

export function useCurrencyStore(): CurrencyStore {
  return currencyStore;
}
