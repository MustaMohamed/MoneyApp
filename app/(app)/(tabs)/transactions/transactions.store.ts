import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';
import { EMPTY_FILTERS, type AdvancedFilters } from './_filter/filter.store';

export type TransactionFilter = TransactionType | 'all';

interface TransactionsScreenState {
  searchQuery: string;
  activeFilter: TransactionFilter;
  appliedFilters: AdvancedFilters;
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  setAppliedFilters: (f: AdvancedFilters) => void;
  clearSearch: () => void;
  reset: () => void;
}

const INITIAL = {
  searchQuery: '',
  activeFilter: 'all' as const,
  appliedFilters: EMPTY_FILTERS,
};

export const useTransactionsScreenStore = create<TransactionsScreenState>((set) => ({
  ...INITIAL,
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveFilter: (f) => set({ activeFilter: f }),
  setAppliedFilters: (f) => set({ appliedFilters: f }),
  clearSearch: () => set({ searchQuery: '' }),
  reset: () => set(INITIAL),
}));
