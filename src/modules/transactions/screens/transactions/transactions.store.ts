import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

import { TransactionType } from '@/constants/enums';
import type {
  PeriodTotals,
  TransactionDayAggregate,
} from '@/modules/transactions/database/transactions';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { EMPTY_FILTERS, type AdvancedFilters } from './filter/filter.store';
import { currentYearMonth, totalsScopeKey, type TransactionPeriod } from './transactions.helpers';

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
  /** The month and accounts filter of the latest request; held `totals` always belong to it. */
  totalsScope: string | undefined;
  /** The month whose totals have landed at least once, under any accounts filter. */
  totalsLoadedYearMonth: string | undefined;
  totalsQueryKey: string | null;
  totalsRequestId: number;
  /** Whether any transaction exists at all; `undefined` until a read lands. */
  hasAnyTransaction: boolean | undefined;
  /** The `mutationVersion` the held answer was read at. */
  existenceVersion: number | undefined;
  existenceRequestId: number;
}

type TransactionsScreenStore = StateShape & {
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  setSelectedMonth: (yearMonth: string) => void;
  setAppliedFilters: (f: AdvancedFilters) => void;
  seedAccountFilter: (accountId: string, yearMonth: string) => void;
  clearSearch: () => void;
  beginTotalsRequest: (
    queryKey: string,
    yearMonth: string,
    accountIds: readonly string[] | undefined,
    preserveData: boolean,
  ) => number;
  resolveTotals: (
    queryKey: string,
    requestId: number,
    totals: Omit<TransactionTotalsState, 'queryKey'>,
  ) => boolean;
  failTotals: (queryKey: string, requestId: number) => boolean;
  hasTotalsForScope: (yearMonth: string, accountIds: readonly string[] | undefined) => boolean;
  beginExistenceRequest: () => number;
  resolveExistence: (requestId: number, mutationVersion: number, hasAny: boolean) => boolean;
  failExistence: (requestId: number) => boolean;
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
    totalsScope: undefined,
    totalsLoadedYearMonth: undefined,
    totalsQueryKey: null,
    totalsRequestId: 0,
    hasAnyTransaction: undefined,
    existenceVersion: undefined,
    existenceRequestId: 0,
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
    beginTotalsRequest: (queryKey, yearMonth, accountIds, preserveData) => {
      const state = get();
      const requestId = state.totalsRequestId + 1;
      const scope = totalsScopeKey(yearMonth, accountIds);
      const keepTotals = preserveData && state.totalsScope === scope;
      set({
        totals: keepTotals ? state.totals : null,
        totalsYearMonth: yearMonth,
        totalsScope: scope,
        totalsLoadedYearMonth: state.totalsLoadedYearMonth === yearMonth ? yearMonth : undefined,
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
      set({
        totals: { ...totals, queryKey, current, previous },
        totalsLoadedYearMonth: state.totalsYearMonth ?? undefined,
      });
      return true;
    },
    failTotals: (queryKey, requestId) => {
      const state = get();
      return state.totalsQueryKey === queryKey && state.totalsRequestId === requestId;
    },
    hasTotalsForScope: (yearMonth, accountIds) => {
      const state = get();
      return state.totalsScope === totalsScopeKey(yearMonth, accountIds) && state.totals !== null;
    },
    beginExistenceRequest: () => {
      const requestId = get().existenceRequestId + 1;
      set({ existenceRequestId: requestId });
      return requestId;
    },
    resolveExistence: (requestId, mutationVersion, hasAny) => {
      if (get().existenceRequestId !== requestId) return false;
      set({ hasAnyTransaction: hasAny, existenceVersion: mutationVersion });
      return true;
    },
    failExistence: (requestId) => get().existenceRequestId === requestId,
    reset: () => set(initialState()),
  })),
);
