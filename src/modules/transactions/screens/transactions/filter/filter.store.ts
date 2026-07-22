import { create } from 'zustand';

import { Currency } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { parseAmountInput } from './filter.helpers';

export interface AdvancedFilters {
  accountIds: string[];
  categoryIds: string[];
  amountCurrency: Currency;
  amountMin?: number;
  amountMax?: number;
}

export const EMPTY_FILTERS: AdvancedFilters = {
  accountIds: [],
  categoryIds: [],
  amountCurrency: Currency.EGP,
};

interface DraftShape {
  draft: AdvancedFilters;
  amountMinText: string;
  amountMaxText: string;
}

type FilterStore = DraftShape & {
  setDraft: (next: AdvancedFilters) => void;
  resetDraft: () => void;
  toggleAccountId: (id: string) => void;
  toggleCategoryId: (id: string) => void;
  setAmountMin: (v?: number) => void;
  setAmountMax: (v?: number) => void;
  setAmountMinText: (value: string) => void;
  setAmountMaxText: (value: string) => void;
  setAmountCurrency: (c: Currency) => void;
};

function amountText(value?: number): string {
  return value?.toString() ?? '';
}

const INITIAL_STATE: DraftShape = {
  draft: EMPTY_FILTERS,
  amountMinText: '',
  amountMaxText: '',
};

export const useFilterStore = createMoneyAppSelectors(
  create<FilterStore>((set) => ({
    ...INITIAL_STATE,

    setDraft: (next) =>
      set({
        draft: next,
        amountMinText: amountText(next.amountMin),
        amountMaxText: amountText(next.amountMax),
      }),
    resetDraft: () => set(INITIAL_STATE),

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

    setAmountMin: (v) =>
      set((s) => ({ draft: { ...s.draft, amountMin: v }, amountMinText: amountText(v) })),
    setAmountMax: (v) =>
      set((s) => ({ draft: { ...s.draft, amountMax: v }, amountMaxText: amountText(v) })),
    setAmountMinText: (value) =>
      set((s) => ({
        amountMinText: value,
        draft: { ...s.draft, amountMin: parseAmountInput(value) },
      })),
    setAmountMaxText: (value) =>
      set((s) => ({
        amountMaxText: value,
        draft: { ...s.draft, amountMax: parseAmountInput(value) },
      })),
    setAmountCurrency: (c) => set((s) => ({ draft: { ...s.draft, amountCurrency: c } })),
  })),
);
