import { create } from 'zustand';

type AccordionSection = 'accounts' | 'categories' | 'amount' | null;

interface FilterStateShape {
  visible: boolean;
  openSection: AccordionSection;
  dateRangeSheetVisible: boolean;
}

interface FilterState {
  state: FilterStateShape;
  open: () => void;
  close: () => void;
  setOpenSection: (s: AccordionSection) => void;
  setDateRangeSheetVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: FilterStateShape = {
  visible: false,
  openSection: null,
  dateRangeSheetVisible: false,
};

export const useFilterState = create<FilterState>((set) => ({
  state: INITIAL_STATE,
  open: () => set((s) => ({ state: { ...s.state, visible: true } })),
  close: () => set((s) => ({ state: { ...s.state, visible: false, openSection: null } })),
  setOpenSection: (sec) => set((s) => ({ state: { ...s.state, openSection: sec } })),
  setDateRangeSheetVisible: (v) =>
    set((s) => ({ state: { ...s.state, dateRangeSheetVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
