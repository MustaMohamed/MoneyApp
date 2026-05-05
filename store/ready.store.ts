import { create } from 'zustand';

const INITIAL_STATE = { ready: false };

interface ReadyStore {
  state: typeof INITIAL_STATE;
  setReady: (ready: boolean) => void;
}

export const useReadyStore = create<ReadyStore>((set) => ({
  state: INITIAL_STATE,
  setReady: (ready) => set((s) => ({ state: { ...s.state, ready } })),
}));
