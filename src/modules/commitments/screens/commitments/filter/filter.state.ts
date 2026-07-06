import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

type CommitmentFilterSection =
  | 'accounts'
  | 'categories'
  | 'amount'
  | 'amountType'
  | 'recurrence'
  | null;

interface CommitmentFilterStateShape {
  visible: boolean;
  openSection: CommitmentFilterSection;
}

type CommitmentFilterState = CommitmentFilterStateShape & {
  open: () => void;
  close: () => void;
  toggleSection: (target: CommitmentFilterSection) => void;
  reset: () => void;
};

const INITIAL_STATE: CommitmentFilterStateShape = {
  visible: false,
  openSection: null,
};

export const useCommitmentFilterState = createMoneyAppSelectors(
  create<CommitmentFilterState>((set) => ({
    ...INITIAL_STATE,
    open: () => set({ visible: true }),
    close: () => set({ visible: false, openSection: null }),
    toggleSection: (target) =>
      set((state) => ({
        openSection: state.openSection === target ? null : target,
      })),
    reset: () => set(INITIAL_STATE),
  })),
);
