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

interface FilterDrawerState {
  visible: boolean;
  draft: AdvancedFilters;

  accountPickerVisible: boolean;
  categoryPickerVisible: boolean;
  customDatePickerVisible: boolean;

  open: (initial: AdvancedFilters) => void;
  close: () => void;
  resetDraft: () => void;

  toggleAccountId: (id: string) => void;
  toggleCategoryId: (id: string) => void;
  setDatePreset: (p: DatePreset) => void;
  setCustomDateRange: (from?: string, to?: string) => void;
  setAmountMin: (v?: number) => void;
  setAmountMax: (v?: number) => void;
  setAmountCurrency: (c: Currency) => void;

  setAccountPickerVisible: (v: boolean) => void;
  setCategoryPickerVisible: (v: boolean) => void;
  setCustomDatePickerVisible: (v: boolean) => void;
}

export const useFilterDrawerStore = create<FilterDrawerState>((set) => ({
  visible: false,
  draft: EMPTY_FILTERS,
  accountPickerVisible: false,
  categoryPickerVisible: false,
  customDatePickerVisible: false,

  open: (initial) => set({ visible: true, draft: initial }),

  close: () =>
    set({
      visible: false,
      accountPickerVisible: false,
      categoryPickerVisible: false,
      customDatePickerVisible: false,
    }),

  resetDraft: () => set({ draft: EMPTY_FILTERS }),

  toggleAccountId: (id) =>
    set((s) => ({
      draft: {
        ...s.draft,
        accountIds: s.draft.accountIds.includes(id)
          ? s.draft.accountIds.filter((x) => x !== id)
          : [...s.draft.accountIds, id],
      },
    })),

  toggleCategoryId: (id) =>
    set((s) => ({
      draft: {
        ...s.draft,
        categoryIds: s.draft.categoryIds.includes(id)
          ? s.draft.categoryIds.filter((x) => x !== id)
          : [...s.draft.categoryIds, id],
      },
    })),

  setDatePreset: (p) => set((s) => ({ draft: { ...s.draft, datePreset: p } })),

  setCustomDateRange: (from, to) =>
    set((s) => ({
      draft: {
        ...s.draft,
        customDateFrom: from,
        customDateTo: to,
        datePreset: DatePreset.Custom,
      },
    })),

  setAmountMin: (v) => set((s) => ({ draft: { ...s.draft, amountMin: v } })),
  setAmountMax: (v) => set((s) => ({ draft: { ...s.draft, amountMax: v } })),
  setAmountCurrency: (c) => set((s) => ({ draft: { ...s.draft, amountCurrency: c } })),

  setAccountPickerVisible: (v) => set({ accountPickerVisible: v }),
  setCategoryPickerVisible: (v) => set({ categoryPickerVisible: v }),
  setCustomDatePickerVisible: (v) => set({ customDatePickerVisible: v }),
}));
