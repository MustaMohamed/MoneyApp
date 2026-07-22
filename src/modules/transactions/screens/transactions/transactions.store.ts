import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { EMPTY_FILTERS, type AdvancedFilters } from './filter/filter.store';
import { currentYearMonth, type TransactionPeriod } from './transactions.helpers';

export type TransactionFilter = TransactionType | 'all';

export interface TransactionTotalsState {
  current: PeriodTotals;
  previous: PeriodTotals | null;
}

interface StateShape {
  searchQuery: string;
  activeFilter: TransactionFilter;
  period: TransactionPeriod;
  appliedFilters: AdvancedFilters;
  totals: TransactionTotalsState | null;
  totalsYearMonth: string | null;
  totalsRequestId: number;
}

type TransactionsScreenStore = StateShape & {
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  setSelectedMonth: (yearMonth: string) => void;
  setAppliedFilters: (f: AdvancedFilters) => void;
  clearSearch: () => void;
  beginTotalsRequest: (yearMonth: string, preserveData: boolean) => number;
  resolveTotals: (yearMonth: string, requestId: number, totals: TransactionTotalsState) => boolean;
  failTotals: (yearMonth: string, requestId: number) => boolean;
  hasTotalsForMonth: (yearMonth: string) => boolean;
  reset: () => void;
};

function initialState(): StateShape {
  return {
    searchQuery: '',
    activeFilter: 'all',
    period: { type: 'month', yearMonth: currentYearMonth() },
    appliedFilters: EMPTY_FILTERS,
    totals: null,
    totalsYearMonth: null,
    totalsRequestId: 0,
  };
}

export const useTransactionsScreenStore = createMoneyAppSelectors(
  create<TransactionsScreenStore>((set, get) => ({
    ...initialState(),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setActiveFilter: (f) => set({ activeFilter: f }),
    setSelectedMonth: (yearMonth) => set({ period: { type: 'month', yearMonth } }),
    setAppliedFilters: (f) => set({ appliedFilters: f }),
    clearSearch: () => set({ searchQuery: '' }),
    beginTotalsRequest: (yearMonth, preserveData) => {
      const state = get();
      const requestId = state.totalsRequestId + 1;
      const keepTotals = preserveData && state.totalsYearMonth === yearMonth;
      set({
        totals: keepTotals ? state.totals : null,
        totalsYearMonth: yearMonth,
        totalsRequestId: requestId,
      });
      return requestId;
    },
    resolveTotals: (yearMonth, requestId, totals) => {
      const state = get();
      if (state.totalsYearMonth !== yearMonth || state.totalsRequestId !== requestId) return false;
      set({ totals });
      return true;
    },
    failTotals: (yearMonth, requestId) => {
      const state = get();
      return state.totalsYearMonth === yearMonth && state.totalsRequestId === requestId;
    },
    hasTotalsForMonth: (yearMonth) => {
      const state = get();
      return state.totalsYearMonth === yearMonth && state.totals !== null;
    },
    reset: () => set(initialState()),
  })),
);
