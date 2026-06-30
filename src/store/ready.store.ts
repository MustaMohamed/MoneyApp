import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

const INITIAL_STATE = { ready: false };

type AppReadyStore = typeof INITIAL_STATE & {
  markReady: () => void;
  reset: () => void;
};

export const useAppReadyStore = createMoneyAppSelectors(
  create<AppReadyStore>((set) => ({
    ...INITIAL_STATE,
    markReady: () => set((s) => ({ ...s, ready: true })),
    reset: () => set(INITIAL_STATE),
  })),
);
