import { create } from 'zustand';

import { Currency } from '@/constants/enums';
import {
  baseCurrencyRepository,
  type IBaseCurrencyRepository,
} from '@/modules/currency/repositories/base_currency.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

const INITIAL_STATE = {
  baseCurrency: Currency.EGP,
};

export type BaseCurrencyStoreState = typeof INITIAL_STATE & {
  setBaseCurrency: (currency: Currency) => Promise<void>;
  load: () => Promise<void>;
  reset: () => void;
};

/**
 * Long-term owner of the hydrated base-currency copy (#348). The repository read is async while
 * screen memos need the value synchronously, so `load()` hydrates it once at app init. The ADR
 * discriminator is unchanged: a screen-entry hook reads this store, a shared component hook takes
 * the value as a parameter (docs/adr/2026-08-31-base-currency-and-rate-plausibility.md §1).
 */
export function createBaseCurrencyStore(
  repository: IBaseCurrencyRepository = baseCurrencyRepository,
) {
  let loadGeneration = 0;

  return createMoneyAppSelectors(
    create<BaseCurrencyStoreState>((set) => ({
      ...INITIAL_STATE,

      setBaseCurrency: async (currency) => {
        try {
          await repository.set(currency);
          set({ baseCurrency: currency });
        } catch (err) {
          console.error('[baseCurrencyStore] setBaseCurrency failed:', err);
          throw err;
        }
      },

      load: async () => {
        const ownerGeneration = ++loadGeneration;
        const baseCurrency = await repository.load();
        if (ownerGeneration === loadGeneration) set({ baseCurrency });
      },

      reset: () => {
        loadGeneration += 1;
        set(INITIAL_STATE);
      },
    })),
  );
}

export const useBaseCurrencyStore = createBaseCurrencyStore(baseCurrencyRepository);
