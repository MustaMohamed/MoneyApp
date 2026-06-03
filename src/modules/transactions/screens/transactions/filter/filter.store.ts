import { signal } from '@preact/signals-react';

import { Currency } from '@/constants/enums';

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

const draft = signal<AdvancedFilters>(EMPTY_FILTERS_V2);

function setDraft(next: AdvancedFilters): void {
  draft.value = next;
}

function resetDraft(): void {
  draft.value = EMPTY_FILTERS_V2;
}

function toggleAccountId(id: string): void {
  const current = draft.value;
  draft.value = {
    ...current,
    accountIds: current.accountIds.includes(id)
      ? current.accountIds.filter((x) => x !== id)
      : [...current.accountIds, id],
  };
}

function toggleCategoryId(id: string): void {
  const current = draft.value;
  draft.value = {
    ...current,
    categoryIds: current.categoryIds.includes(id)
      ? current.categoryIds.filter((x) => x !== id)
      : [...current.categoryIds, id],
  };
}

function setAmountMin(v?: number): void {
  draft.value = { ...draft.value, amountMin: v };
}

function setAmountMax(v?: number): void {
  draft.value = { ...draft.value, amountMax: v };
}

function setAmountCurrency(c: Currency): void {
  draft.value = { ...draft.value, amountCurrency: c };
}

export function useFilterStore() {
  return {
    state: {
      draft,
    },
    setDraft,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    setAmountMin,
    setAmountMax,
    setAmountCurrency,
  };
}
