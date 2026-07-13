import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface SpendingPlanDetailState {
  loadFinished: boolean;
  beginLoad: () => void;
  finishLoad: () => void;
  reset: () => void;
}

const INITIAL_STATE = { loadFinished: false };

export const useSpendingPlanDetailState = createMoneyAppSelectors(
  create<SpendingPlanDetailState>((set) => ({
    ...INITIAL_STATE,
    beginLoad: () => set({ loadFinished: false }),
    finishLoad: () => set({ loadFinished: true }),
    reset: () => set(INITIAL_STATE),
  })),
);
