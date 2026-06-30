import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface TransactionsStateShape {
  refreshing: boolean;
}

type TransactionsState = TransactionsStateShape & {
  setRefreshing: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: TransactionsStateShape = {
  refreshing: false,
};

export const useTransactionsState = createMoneyAppSelectors(
  create<TransactionsState>((set) => ({
    ...INITIAL_STATE,
    setRefreshing: (v) => set({ refreshing: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
