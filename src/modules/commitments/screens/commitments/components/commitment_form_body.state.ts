import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CommitmentFormBodyStateShape {
  categoryPickerVisible: boolean;
  accountPickerVisible: boolean;
  showStartDatePicker: boolean;
  showEndDatePicker: boolean;
}

type CommitmentFormBodyState = CommitmentFormBodyStateShape & {
  setCategoryPickerVisible: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  setShowStartDatePicker: (v: boolean) => void;
  setShowEndDatePicker: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: CommitmentFormBodyStateShape = {
  categoryPickerVisible: false,
  accountPickerVisible: false,
  showStartDatePicker: false,
  showEndDatePicker: false,
};

export const useCommitmentFormBodyState = createMoneyAppSelectors(
  create<CommitmentFormBodyState>((set) => ({
    ...INITIAL_STATE,
    setCategoryPickerVisible: (v) => set({ categoryPickerVisible: v }),
    setAccountPickerVisible: (v) => set({ accountPickerVisible: v }),
    setShowStartDatePicker: (v) => set({ showStartDatePicker: v }),
    setShowEndDatePicker: (v) => set({ showEndDatePicker: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
