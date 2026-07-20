import { create } from 'zustand';

import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export interface TransactionTotalsState {
  current: PeriodTotals;
  previous: PeriodTotals | null;
}

export type TransactionTotalsStatus =
  | 'idle'
  | 'initialLoading'
  | 'ready'
  | 'refreshing'
  | 'firstLoadError'
  | 'refreshErrorWithData';

interface TransactionsStateShape {
  totals: TransactionTotalsState | null;
  totalsYearMonth: string | null;
  totalsStatus: TransactionTotalsStatus;
  scrollOffset: number;
}

type TransactionsState = TransactionsStateShape & {
  beginTotalsLoad: (yearMonth: string, preserveData: boolean) => void;
  resolveTotals: (yearMonth: string, totals: TransactionTotalsState) => void;
  failTotals: (yearMonth: string) => void;
  setScrollOffset: (offset: number) => void;
  reset: () => void;
};

const INITIAL_STATE: TransactionsStateShape = {
  totals: null,
  totalsYearMonth: null,
  totalsStatus: 'idle',
  scrollOffset: 0,
};

export const useTransactionsState = createMoneyAppSelectors(
  create<TransactionsState>((set) => ({
    ...INITIAL_STATE,
    beginTotalsLoad: (yearMonth, preserveData) =>
      set((state) => {
        const canPreserve =
          preserveData && state.totalsYearMonth === yearMonth && state.totals !== null;
        return {
          totals: canPreserve ? state.totals : null,
          totalsYearMonth: yearMonth,
          totalsStatus: canPreserve ? 'refreshing' : 'initialLoading',
        };
      }),
    resolveTotals: (yearMonth, totals) =>
      set((state) =>
        state.totalsYearMonth === yearMonth ? { totals, totalsStatus: 'ready' } : state,
      ),
    failTotals: (yearMonth) =>
      set((state) => {
        if (state.totalsYearMonth !== yearMonth) return state;
        return {
          totalsStatus: state.totals ? 'refreshErrorWithData' : 'firstLoadError',
        };
      }),
    setScrollOffset: (scrollOffset) => set({ scrollOffset: Math.max(0, scrollOffset) }),
    reset: () => set(INITIAL_STATE),
  })),
);
