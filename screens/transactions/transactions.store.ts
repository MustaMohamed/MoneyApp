import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';
import { EMPTY_FILTERS, type AdvancedFilters } from './filter/filter.store';

export type TransactionFilter = TransactionType | 'all';

const INITIAL_STATE = {
  searchQuery: '',
  activeFilter: 'all' as TransactionFilter,
  appliedFilters: EMPTY_FILTERS,
};

interface TransactionsScreenStore {
  state: typeof INITIAL_STATE;
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  setAppliedFilters: (f: AdvancedFilters) => void;
  clearSearch: () => void;
  reset: () => void;
}

export const useTransactionsScreenStore = create<TransactionsScreenStore>((set) => ({
  state: INITIAL_STATE,
  setSearchQuery: (q) => set((s) => ({ state: { ...s.state, searchQuery: q } })),
  setActiveFilter: (f) => set((s) => ({ state: { ...s.state, activeFilter: f } })),
  setAppliedFilters: (f) => set((s) => ({ state: { ...s.state, appliedFilters: f } })),
  clearSearch: () => set((s) => ({ state: { ...s.state, searchQuery: '' } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
