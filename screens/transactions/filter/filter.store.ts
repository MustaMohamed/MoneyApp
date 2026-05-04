import { create } from 'zustand';

import { Currency, DatePreset } from '@/constants/enums';

export interface AdvancedFilters {
  accountIds: string[];
  categoryIds: string[];
  datePreset: DatePreset;
  customDateFrom?: string;
  customDateTo?: string;
  amountCurrency: Currency;
  amountMin?: number;
  amountMax?: number;
}

export const EMPTY_FILTERS: AdvancedFilters = {
  accountIds: [],
  categoryIds: [],
  datePreset: DatePreset.AllTime,
  amountCurrency: Currency.EGP,
};

interface FilterDrawerStoreShape {
  draft: AdvancedFilters;
}

interface FilterDrawerStore {
  state: FilterDrawerStoreShape;
  setDraft: (next: AdvancedFilters) => void;
  resetDraft: () => void;
  toggleAccountId: (id: string) => void;
  toggleCategoryId: (id: string) => void;
  setDatePreset: (p: DatePreset) => void;
  setCustomDateRange: (from?: string, to?: string) => void;
  setAmountMin: (v?: number) => void;
  setAmountMax: (v?: number) => void;
  setAmountCurrency: (c: Currency) => void;
}

const INITIAL_STATE: FilterDrawerStoreShape = {
  draft: EMPTY_FILTERS,
};

export const useFilterDrawerStore = create<FilterDrawerStore>((set) => ({
  state: INITIAL_STATE,

  setDraft: (next) => set((s) => ({ state: { ...s.state, draft: next } })),

  resetDraft: () => set((s) => ({ state: { ...s.state, draft: EMPTY_FILTERS } })),

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

  setDatePreset: (p) =>
    set((s) => ({ state: { ...s.state, draft: { ...s.state.draft, datePreset: p } } })),

  setCustomDateRange: (from, to) =>
    set((s) => ({
      state: {
        ...s.state,
        draft: {
          ...s.state.draft,
          customDateFrom: from,
          customDateTo: to,
          datePreset: DatePreset.Custom,
        },
      },
    })),

  setAmountMin: (v) =>
    set((s) => ({ state: { ...s.state, draft: { ...s.state.draft, amountMin: v } } })),
  setAmountMax: (v) =>
    set((s) => ({ state: { ...s.state, draft: { ...s.state.draft, amountMax: v } } })),
  setAmountCurrency: (c) =>
    set((s) => ({ state: { ...s.state, draft: { ...s.state.draft, amountCurrency: c } } })),
}));
