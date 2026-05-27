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

interface FilterStore {
  state: DraftShape;
  setDraft: (next: AdvancedFilters) => void;
  resetDraft: () => void;
  toggleAccountId: (id: string) => void;
  toggleCategoryId: (id: string) => void;
  setAmountMin: (v?: number) => void;
  setAmountMax: (v?: number) => void;
  setAmountCurrency: (c: Currency) => void;
}

const INITIAL_STATE: DraftShape = { draft: EMPTY_FILTERS_V2 };

export const useFilterStore = createMoneyAppSelectors(
  create<FilterStore>((set) => ({
    state: INITIAL_STATE,

    setDraft: (next) => set((s) => ({ state: { ...s.state, draft: next } })),
    resetDraft: () => set((s) => ({ state: { ...s.state, draft: EMPTY_FILTERS_V2 } })),

    toggleAccountId: (id) =>
      set((s) => ({
        state: {
          ...s.state,
          draft: {
            ...s.state.draft,
            accountIds: s.state.draft.accountIds.includes(id)
              ? s.state.draft.accountIds.filter((x) => x !== id)
              : [...s.state.draft.accountIds, id],
          },
        },
      })),

    toggleCategoryId: (id) =>
      set((s) => ({
        state: {
          ...s.state,
          draft: {
            ...s.state.draft,
            categoryIds: s.state.draft.categoryIds.includes(id)
              ? s.state.draft.categoryIds.filter((x) => x !== id)
              : [...s.state.draft.categoryIds, id],
          },
        },
      })),

    setAmountMin: (v) =>
      set((s) => ({ state: { ...s.state, draft: { ...s.state.draft, amountMin: v } } })),
    setAmountMax: (v) =>
      set((s) => ({ state: { ...s.state, draft: { ...s.state.draft, amountMax: v } } })),
    setAmountCurrency: (c) =>
      set((s) => ({ state: { ...s.state, draft: { ...s.state.draft, amountCurrency: c } } })),
  })),
);
