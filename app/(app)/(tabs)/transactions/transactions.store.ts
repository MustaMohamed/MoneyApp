import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';

export type TransactionFilter = TransactionType | 'all';

interface TransactionsScreenState {
  searchQuery: string;
  activeFilter: TransactionFilter;
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  clearSearch: () => void;
  reset: () => void;
}

const INITIAL = { searchQuery: '', activeFilter: 'all' as const };

export const useTransactionsScreenStore = create<TransactionsScreenState>((set) => ({
  ...INITIAL,
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveFilter: (f) => set({ activeFilter: f }),
  clearSearch: () => set({ searchQuery: '' }),
  reset: () => set(INITIAL),
}));
