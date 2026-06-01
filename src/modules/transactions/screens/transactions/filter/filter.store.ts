import { signal, type ReadonlySignal } from '@preact/signals-react';

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

type FilterSignalState = {
  draft: ReadonlySignal<AdvancedFilters>;
};

class FilterStore {
  private readonly draft = signal(EMPTY_FILTERS_V2);

  readonly state: FilterSignalState = {
    draft: this.draft,
  };

  setDraft = (next: AdvancedFilters) => {
    this.draft.value = next;
  };
  resetDraft = () => {
    this.draft.value = EMPTY_FILTERS_V2;
  };
  toggleAccountId = (id: string) => {
    const draft = this.draft.value;
    this.draft.value = {
      ...draft,
      accountIds: draft.accountIds.includes(id)
        ? draft.accountIds.filter((x) => x !== id)
        : [...draft.accountIds, id],
    };
  };
  toggleCategoryId = (id: string) => {
    const draft = this.draft.value;
    this.draft.value = {
      ...draft,
      categoryIds: draft.categoryIds.includes(id)
        ? draft.categoryIds.filter((x) => x !== id)
        : [...draft.categoryIds, id],
    };
  };
  setAmountMin = (v?: number) => {
    this.draft.value = { ...this.draft.value, amountMin: v };
  };
  setAmountMax = (v?: number) => {
    this.draft.value = { ...this.draft.value, amountMax: v };
  };
  setAmountCurrency = (c: Currency) => {
    this.draft.value = { ...this.draft.value, amountCurrency: c };
  };
}

const filterStore = new FilterStore();

export function useFilterStore(): FilterStore {
  return filterStore;
}
