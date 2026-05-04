import { create } from 'zustand';

interface FilterDateCustomPickerStateShape {
  from: Date | undefined;
  to: Date | undefined;
  showFromPicker: boolean;
  showToPicker: boolean;
}

interface FilterDateCustomPickerState {
  state: FilterDateCustomPickerStateShape;
  setFrom: (d: Date | undefined) => void;
  setTo: (d: Date | undefined) => void;
  setShowFromPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  initialize: (from: Date | undefined, to: Date | undefined) => void;
  reset: () => void;
}

const INITIAL_STATE: FilterDateCustomPickerStateShape = {
  from: undefined,
  to: undefined,
  showFromPicker: false,
  showToPicker: false,
};

export const useFilterDateCustomPickerState = create<FilterDateCustomPickerState>((set) => ({
  state: INITIAL_STATE,
  setFrom: (d) => set((s) => ({ state: { ...s.state, from: d } })),
  setTo: (d) => set((s) => ({ state: { ...s.state, to: d } })),
  setShowFromPicker: (v) => set((s) => ({ state: { ...s.state, showFromPicker: v } })),
  setShowToPicker: (v) => set((s) => ({ state: { ...s.state, showToPicker: v } })),
  initialize: (from, to) =>
    set({ state: { from, to, showFromPicker: false, showToPicker: false } }),
  reset: () => set({ state: INITIAL_STATE }),
}));
