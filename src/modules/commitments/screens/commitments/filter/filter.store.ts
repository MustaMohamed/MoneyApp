import { create } from 'zustand';

import { AmountType, Currency, RecurrencePreset } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { parseCommitmentAmountInput } from './filter.helpers';

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
  amountMinText: string;
  amountMaxText: string;
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
  setAmountMinText: (value: string) => void;
  setAmountMaxText: (value: string) => void;
  setAmountCurrency: (currency: Currency) => void;
};

function amountText(value?: number): string {
  return value?.toString() ?? '';
}

const INITIAL_STATE: DraftShape = {
  draft: EMPTY_COMMITMENT_FILTERS,
  amountMinText: '',
  amountMaxText: '',
};

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export const useCommitmentFilterStore = createMoneyAppSelectors(
  create<CommitmentFilterStore>((set) => ({
    ...INITIAL_STATE,
    setDraft: (next) =>
      set({
        draft: next,
        amountMinText: amountText(next.amountMin),
        amountMaxText: amountText(next.amountMax),
      }),
    resetDraft: () => set(INITIAL_STATE),
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
    setAmountMin: (value) =>
      set((state) => ({
        draft: { ...state.draft, amountMin: value },
        amountMinText: amountText(value),
      })),
    setAmountMax: (value) =>
      set((state) => ({
        draft: { ...state.draft, amountMax: value },
        amountMaxText: amountText(value),
      })),
    setAmountMinText: (value) =>
      set((state) => ({
        amountMinText: value,
        draft: { ...state.draft, amountMin: parseCommitmentAmountInput(value) },
      })),
    setAmountMaxText: (value) =>
      set((state) => ({
        amountMaxText: value,
        draft: { ...state.draft, amountMax: parseCommitmentAmountInput(value) },
      })),
    setAmountCurrency: (currency) =>
      set((state) => ({ draft: { ...state.draft, amountCurrency: currency } })),
  })),
);
