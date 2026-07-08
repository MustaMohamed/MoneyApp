import { create } from 'zustand';

import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface TransactionTotalsState {
  current: PeriodTotals;
  previous: PeriodTotals | null;
}

interface TransactionsStateShape {
  refreshing: boolean;
  totals: TransactionTotalsState | null;
  totalsYearMonth: string | null;
}

type TransactionsState = TransactionsStateShape & {
  setRefreshing: (v: boolean) => void;
  setTotals: (yearMonth: string, totals: TransactionTotalsState | null) => void;
  reset: () => void;
};

const INITIAL_STATE: TransactionsStateShape = {
  refreshing: false,
  totals: null,
  totalsYearMonth: null,
};

export const useTransactionsState = createMoneyAppSelectors(
  create<TransactionsState>((set) => ({
    ...INITIAL_STATE,
    setRefreshing: (v) => set({ refreshing: v }),
    setTotals: (yearMonth, totals) => set({ totals, totalsYearMonth: yearMonth }),
    reset: () => set(INITIAL_STATE),
  })),
);
