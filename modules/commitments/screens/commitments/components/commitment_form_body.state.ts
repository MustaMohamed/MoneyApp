import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CommitmentFormBodyStateShape {
  categoryPickerVisible: boolean;
  accountPickerVisible: boolean;
  showStartDatePicker: boolean;
  showEndDatePicker: boolean;
}

interface CommitmentFormBodyState {
  state: CommitmentFormBodyStateShape;
  setCategoryPickerVisible: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  setShowStartDatePicker: (v: boolean) => void;
  setShowEndDatePicker: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: CommitmentFormBodyStateShape = {
  categoryPickerVisible: false,
  accountPickerVisible: false,
  showStartDatePicker: false,
  showEndDatePicker: false,
};

export const useCommitmentFormBodyState = createMoneyAppSelectors(
  create<CommitmentFormBodyState>((set) => ({
    state: INITIAL_STATE,
    setCategoryPickerVisible: (v) =>
      set((s) => ({ state: { ...s.state, categoryPickerVisible: v } })),
    setAccountPickerVisible: (v) =>
      set((s) => ({ state: { ...s.state, accountPickerVisible: v } })),
    setShowStartDatePicker: (v) => set((s) => ({ state: { ...s.state, showStartDatePicker: v } })),
    setShowEndDatePicker: (v) => set((s) => ({ state: { ...s.state, showEndDatePicker: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
