import { create } from 'zustand';

interface FilterAmountSectionStateShape {
  minStr: string;
  maxStr: string;
}

interface FilterAmountSectionState {
  state: FilterAmountSectionStateShape;
  setMinStr: (s: string) => void;
  setMaxStr: (s: string) => void;
  reset: () => void;
}

const INITIAL_STATE: FilterAmountSectionStateShape = {
  minStr: '',
  maxStr: '',
};

export const useFilterAmountSectionState = create<FilterAmountSectionState>((set) => ({
  state: INITIAL_STATE,
  setMinStr: (v) => set((s) => ({ state: { ...s.state, minStr: v } })),
  setMaxStr: (v) => set((s) => ({ state: { ...s.state, maxStr: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
