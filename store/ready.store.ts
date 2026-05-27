import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

const INITIAL_STATE = { ready: false };

interface ReadyStore {
  state: typeof INITIAL_STATE;
  setReady: (ready: boolean) => void;
}

export const useReadyStore = createMoneyAppSelectors(
  create<ReadyStore>((set) => ({
    state: INITIAL_STATE,
    setReady: (ready) => set((s) => ({ state: { ...s.state, ready } })),
  })),
);
