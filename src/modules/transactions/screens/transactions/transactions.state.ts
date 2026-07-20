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
  totalsRequestId: number;
  scrollOffset: number;
}

type TransactionsState = TransactionsStateShape & {
  beginTotalsLoad: (yearMonth: string, preserveData: boolean) => number;
  resolveTotals: (yearMonth: string, requestId: number, totals: TransactionTotalsState) => void;
  failTotals: (yearMonth: string, requestId: number) => void;
  setScrollOffset: (offset: number) => void;
  reset: () => void;
};

const INITIAL_STATE: TransactionsStateShape = {
  totals: null,
  totalsYearMonth: null,
  totalsStatus: 'idle',
  totalsRequestId: 0,
  scrollOffset: 0,
};

export const useTransactionsState = createMoneyAppSelectors(
  create<TransactionsState>((set, get) => ({
    ...INITIAL_STATE,
    beginTotalsLoad: (yearMonth, preserveData) => {
      const requestId = get().totalsRequestId + 1;
      set((state) => {
        const canPreserve =
          preserveData && state.totalsYearMonth === yearMonth && state.totals !== null;
        return {
          totals: canPreserve ? state.totals : null,
          totalsYearMonth: yearMonth,
          totalsStatus: canPreserve ? 'refreshing' : 'initialLoading',
          totalsRequestId: requestId,
        };
      });
      return requestId;
    },
    resolveTotals: (yearMonth, requestId, totals) =>
      set((state) =>
        state.totalsYearMonth === yearMonth && state.totalsRequestId === requestId
          ? { totals, totalsStatus: 'ready' }
          : state,
      ),
    failTotals: (yearMonth, requestId) =>
      set((state) => {
        if (state.totalsYearMonth !== yearMonth || state.totalsRequestId !== requestId)
          return state;
        return {
          totalsStatus: state.totals ? 'refreshErrorWithData' : 'firstLoadError',
        };
      }),
    setScrollOffset: (scrollOffset) => set({ scrollOffset: Math.max(0, scrollOffset) }),
    reset: () => set(INITIAL_STATE),
  })),
);
