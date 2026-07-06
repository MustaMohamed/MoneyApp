import { create } from 'zustand';

import { AmountType, Currency, RecurrencePreset } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export interface CommitmentAdvancedFilters {
  accountIds: string[];
  categoryIds: string[];
  amountCurrency: Currency;
  amountTypes: AmountType[];
  recurrencePresets: RecurrencePreset[];
  amountMin?: number;
  amountMax?: number;
}

export const EMPTY_COMMITMENT_FILTERS: CommitmentAdvancedFilters = {
  accountIds: [],
  categoryIds: [],
  amountCurrency: Currency.EGP,
  amountTypes: [],
  recurrencePresets: [],
};

interface DraftShape {
  draft: CommitmentAdvancedFilters;
}

type CommitmentFilterStore = DraftShape & {
  setDraft: (next: CommitmentAdvancedFilters) => void;
  resetDraft: () => void;
  toggleAccountId: (id: string) => void;
  toggleCategoryId: (id: string) => void;
  toggleAmountType: (type: AmountType) => void;
  toggleRecurrencePreset: (preset: RecurrencePreset) => void;
  setAmountMin: (value?: number) => void;
  setAmountMax: (value?: number) => void;
  setAmountCurrency: (currency: Currency) => void;
};

const INITIAL_STATE: DraftShape = { draft: EMPTY_COMMITMENT_FILTERS };

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export const useCommitmentFilterStore = createMoneyAppSelectors(
  create<CommitmentFilterStore>((set) => ({
    ...INITIAL_STATE,
    setDraft: (next) => set({ draft: next }),
    resetDraft: () => set({ draft: EMPTY_COMMITMENT_FILTERS }),
    toggleAccountId: (id) =>
      set((state) => ({
        draft: { ...state.draft, accountIds: toggleValue(state.draft.accountIds, id) },
      })),
    toggleCategoryId: (id) =>
      set((state) => ({
        draft: { ...state.draft, categoryIds: toggleValue(state.draft.categoryIds, id) },
      })),
    toggleAmountType: (type) =>
      set((state) => ({
        draft: { ...state.draft, amountTypes: toggleValue(state.draft.amountTypes, type) },
      })),
    toggleRecurrencePreset: (preset) =>
      set((state) => ({
        draft: {
          ...state.draft,
          recurrencePresets: toggleValue(state.draft.recurrencePresets, preset),
        },
      })),
    setAmountMin: (value) => set((state) => ({ draft: { ...state.draft, amountMin: value } })),
    setAmountMax: (value) => set((state) => ({ draft: { ...state.draft, amountMax: value } })),
    setAmountCurrency: (currency) =>
      set((state) => ({ draft: { ...state.draft, amountCurrency: currency } })),
  })),
);
