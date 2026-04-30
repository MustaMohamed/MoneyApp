import { create } from 'zustand';

interface LayoutStore {
  ready: boolean;
  setReady: (ready: boolean) => void;
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
}));
