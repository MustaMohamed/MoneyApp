import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

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
  /**
   * Toggles the given section open/closed using a functional updater so the
   * current value of openSection is read at call time, not at render time.
   * This prevents the stale-closure bug where a second tap on an already-open
   * header re-opens it because the arrow function in JSX captured an outdated
   * openSection value from the previous render. Use this from JSX — there is
   * no plain `setOpenSection` setter to invite the bug back.
   */
  toggleSection: (target: AccordionSection) => void;
  setDateRangeSheetVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: FilterStateShape = {
  visible: false,
  openSection: null,
  dateRangeSheetVisible: false,
};

export const useFilterState = createMoneyAppSelectors(
  create<FilterState>((set) => ({
    state: INITIAL_STATE,
    open: () => set((s) => ({ state: { ...s.state, visible: true } })),
    close: () => set((s) => ({ state: { ...s.state, visible: false, openSection: null } })),
    toggleSection: (target) =>
      set((s) => ({
        state: { ...s.state, openSection: s.state.openSection === target ? null : target },
      })),
    setDateRangeSheetVisible: (v) =>
      set((s) => ({ state: { ...s.state, dateRangeSheetVisible: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
