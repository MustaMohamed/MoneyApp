import { create } from 'zustand';

import { Currency } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export interface AdvancedFilters {
  accountIds: string[];
  categoryIds: string[];
  amountCurrency: Currency;
  amountMin?: number;
  amountMax?: number;
}

export const EMPTY_FILTERS_V2: AdvancedFilters = {
  accountIds: [],
  categoryIds: [],
  amountCurrency: Currency.EGP,
};

interface DraftShape {
  draft: AdvancedFilters;
}

type FilterStore = DraftShape & {
  setDraft: (next: AdvancedFilters) => void;
  resetDraft: () => void;
  toggleAccountId: (id: string) => void;
  toggleCategoryId: (id: string) => void;
  setAmountMin: (v?: number) => void;
  setAmountMax: (v?: number) => void;
  setAmountCurrency: (c: Currency) => void;
};

const INITIAL_STATE: DraftShape = { draft: EMPTY_FILTERS_V2 };

export const useFilterStore = createMoneyAppSelectors(
  create<FilterStore>((set) => ({
    ...INITIAL_STATE,

    setDraft: (next) => set((s) => ({ ...s, draft: next })),
    resetDraft: () => set((s) => ({ ...s, draft: EMPTY_FILTERS_V2 })),

    toggleAccountId: (id) =>
      set((s) => ({
        ...s,
        draft: {
          ...s.draft,
          accountIds: s.draft.accountIds.includes(id)
            ? s.draft.accountIds.filter((x) => x !== id)
            : [...s.draft.accountIds, id],
        },
      })),

    toggleCategoryId: (id) =>
      set((s) => ({
        ...s,
        draft: {
          ...s.draft,
          categoryIds: s.draft.categoryIds.includes(id)
            ? s.draft.categoryIds.filter((x) => x !== id)
            : [...s.draft.categoryIds, id],
        },
      })),

    setAmountMin: (v) => set((s) => ({ ...s, draft: { ...s.draft, amountMin: v } })),
    setAmountMax: (v) => set((s) => ({ ...s, draft: { ...s.draft, amountMax: v } })),
    setAmountCurrency: (c) => set((s) => ({ ...s, draft: { ...s.draft, amountCurrency: c } })),
  })),
);
