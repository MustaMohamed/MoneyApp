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

interface TransactionsScreenStore {
  state: StateShape;
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  setPeriod: (p: CarouselSelection) => void;
  setAppliedFilters: (f: AdvancedFilters) => void;
  clearSearch: () => void;
  reset: () => void;
}

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
    state: initialState(),
    setSearchQuery: (q) => set((s) => ({ state: { ...s.state, searchQuery: q } })),
    setActiveFilter: (f) => set((s) => ({ state: { ...s.state, activeFilter: f } })),
    setPeriod: (p) => set((s) => ({ state: { ...s.state, period: p } })),
    setAppliedFilters: (f) => set((s) => ({ state: { ...s.state, appliedFilters: f } })),
    clearSearch: () => set((s) => ({ state: { ...s.state, searchQuery: '' } })),
    reset: () => set({ state: initialState() }),
  })),
);
