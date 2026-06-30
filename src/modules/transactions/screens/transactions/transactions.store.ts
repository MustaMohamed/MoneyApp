import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { EMPTY_FILTERS_V2, type AdvancedFilters } from './filter/filter.store';
import { currentYearMonth, type CarouselSelection } from './transactions.helpers';

export type TransactionFilter = TransactionType | 'all';

interface StateShape {
  searchQuery: string;
  activeFilter: TransactionFilter;
  period: CarouselSelection;
  appliedFilters: AdvancedFilters;
}

type TransactionsScreenStore = StateShape & {
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  setPeriod: (p: CarouselSelection) => void;
  setAppliedFilters: (f: AdvancedFilters) => void;
  clearSearch: () => void;
  reset: () => void;
};

function initialState(): StateShape {
  return {
    searchQuery: '',
    activeFilter: 'all',
    period: { type: 'month', yearMonth: currentYearMonth() },
    appliedFilters: EMPTY_FILTERS_V2,
  };
}

export const useTransactionsScreenStore = createMoneyAppSelectors(
  create<TransactionsScreenStore>((set) => ({
    ...initialState(),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setActiveFilter: (f) => set({ activeFilter: f }),
    setPeriod: (p) => set({ period: p }),
    setAppliedFilters: (f) => set({ appliedFilters: f }),
    clearSearch: () => set({ searchQuery: '' }),
    reset: () => set(initialState()),
  })),
);
