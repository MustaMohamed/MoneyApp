import { create } from 'zustand';

interface ReadyStore {
  ready: boolean;
  setReady: (ready: boolean) => void;
}

export const useReadyStore = create<ReadyStore>((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
}));
