import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface TransactionsStateShape {
  refreshing: boolean;
}

interface TransactionsState {
  state: TransactionsStateShape;
  setRefreshing: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: TransactionsStateShape = {
  refreshing: false,
};

export const useTransactionsState = createMoneyAppSelectors(
  create<TransactionsState>((set) => ({
    state: INITIAL_STATE,
    setRefreshing: (v) => set((s) => ({ state: { ...s.state, refreshing: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
