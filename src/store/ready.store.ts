import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

const INITIAL_STATE = { ready: false };

type ReadyStore = typeof INITIAL_STATE & {
  setReady: (ready: boolean) => void;
};

export const useReadyStore = createMoneyAppSelectors(
  create<ReadyStore>((set) => ({
    ...INITIAL_STATE,
    setReady: (ready) => set((s) => ({ ...s, ready })),
  })),
);
