import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

type AccordionSection = 'accounts' | 'categories' | 'amount' | null;

interface FilterStateShape {
  visible: boolean;
  openSection: AccordionSection;
}

type FilterState = FilterStateShape & {
  open: () => void;
  close: () => void;
  /** Functional updater, so a JSX arrow cannot capture a stale `openSection`. */
  toggleSection: (target: AccordionSection) => void;
  reset: () => void;
};

const INITIAL_STATE: FilterStateShape = {
  visible: false,
  openSection: null,
};

export const useFilterState = createMoneyAppSelectors(
  create<FilterState>((set) => ({
    ...INITIAL_STATE,
    open: () => set({ visible: true }),
    close: () => set({ visible: false, openSection: null }),
    toggleSection: (target) =>
      set((s) => ({
        openSection: s.openSection === target ? null : target,
      })),
    reset: () => set(INITIAL_STATE),
  })),
);
