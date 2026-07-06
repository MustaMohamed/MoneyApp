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
}

type TransactionsState = TransactionsStateShape & {
  setRefreshing: (v: boolean) => void;
  setTotals: (totals: TransactionTotalsState | null) => void;
  reset: () => void;
};

const INITIAL_STATE: TransactionsStateShape = {
  refreshing: false,
  totals: null,
};

export const useTransactionsState = createMoneyAppSelectors(
  create<TransactionsState>((set) => ({
    ...INITIAL_STATE,
    setRefreshing: (v) => set({ refreshing: v }),
    setTotals: (totals) => set({ totals }),
    reset: () => set(INITIAL_STATE),
  })),
);
