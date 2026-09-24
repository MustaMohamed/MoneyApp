import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

import { TransactionType } from '@/constants/enums';
import type {
  PeriodTotals,
  TransactionDayAggregate,
} from '@/modules/transactions/database/transactions';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { EMPTY_FILTERS, type AdvancedFilters } from './filter/filter.store';
import { currentYearMonth, type TransactionPeriod } from './transactions.helpers';

export type TransactionFilter = TransactionType | 'all';

export interface TransactionTotalsState {
  queryKey: string;
  current: PeriodTotals;
  previous: PeriodTotals | null;
  days: TransactionDayAggregate[];
  matchCount: number;
  matchNetEgp: number;
}

interface StateShape {
  searchQuery: string;
  activeFilter: TransactionFilter;
  period: TransactionPeriod;
  appliedFilters: AdvancedFilters;
  totals: TransactionTotalsState | null;
  totalsYearMonth: string | null;
  totalsQueryKey: string | null;
  totalsRequestId: number;
}

type TransactionsScreenStore = StateShape & {
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  setSelectedMonth: (yearMonth: string) => void;
  setAppliedFilters: (f: AdvancedFilters) => void;
  seedAccountFilter: (accountId: string, yearMonth: string) => void;
  clearSearch: () => void;
  beginTotalsRequest: (queryKey: string, yearMonth: string, preserveData: boolean) => number;
  resolveTotals: (
    queryKey: string,
    requestId: number,
    totals: Omit<TransactionTotalsState, 'queryKey'>,
  ) => boolean;
  failTotals: (queryKey: string, requestId: number) => boolean;
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
    totalsQueryKey: null,
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
    // One publication: the screen's query and totals effects both key off these four fields.
    seedAccountFilter: (accountId, yearMonth) =>
      set({
        searchQuery: '',
        activeFilter: 'all',
        period: { type: 'month', yearMonth },
        appliedFilters: { ...EMPTY_FILTERS, accountIds: [accountId] },
      }),
    clearSearch: () => set({ searchQuery: '' }),
    beginTotalsRequest: (queryKey, yearMonth, preserveData) => {
      const state = get();
      const requestId = state.totalsRequestId + 1;
      const keepTotals = preserveData && state.totalsYearMonth === yearMonth;
      set({
        totals: keepTotals ? state.totals : null,
        totalsYearMonth: yearMonth,
        totalsQueryKey: queryKey,
        totalsRequestId: requestId,
      });
      return requestId;
    },
    resolveTotals: (queryKey, requestId, totals) => {
      const state = get();
      if (state.totalsQueryKey !== queryKey || state.totalsRequestId !== requestId) return false;
      const held = state.totals;
      // M25: equal scoped figures keep their identity so the hero skips a keystroke's render.
      const current = held && shallow(held.current, totals.current) ? held.current : totals.current;
      const previous =
        held && shallow(held.previous, totals.previous) ? held.previous : totals.previous;
      set({ totals: { ...totals, queryKey, current, previous } });
      return true;
    },
    failTotals: (queryKey, requestId) => {
      const state = get();
      return state.totalsQueryKey === queryKey && state.totalsRequestId === requestId;
    },
    hasTotalsForMonth: (yearMonth) => {
      const state = get();
      return state.totalsYearMonth === yearMonth && state.totals !== null;
    },
    reset: () => set(initialState()),
  })),
);
