import { create } from 'zustand';

interface FilterDrawerStateShape {
  visible: boolean;
  accountPickerVisible: boolean;
  categoryPickerVisible: boolean;
  customDatePickerVisible: boolean;
}

interface FilterDrawerState {
  state: FilterDrawerStateShape;
  open: () => void;
  close: () => void;
  setAccountPickerVisible: (v: boolean) => void;
  setCategoryPickerVisible: (v: boolean) => void;
  setCustomDatePickerVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: FilterDrawerStateShape = {
  visible: false,
  accountPickerVisible: false,
  categoryPickerVisible: false,
  customDatePickerVisible: false,
};

export const useFilterDrawerState = create<FilterDrawerState>((set) => ({
  state: INITIAL_STATE,
  open: () => set((s) => ({ state: { ...s.state, visible: true } })),
  close: () => set({ state: INITIAL_STATE }),
  setAccountPickerVisible: (v) => set((s) => ({ state: { ...s.state, accountPickerVisible: v } })),
  setCategoryPickerVisible: (v) =>
    set((s) => ({ state: { ...s.state, categoryPickerVisible: v } })),
  setCustomDatePickerVisible: (v) =>
    set((s) => ({ state: { ...s.state, customDatePickerVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
