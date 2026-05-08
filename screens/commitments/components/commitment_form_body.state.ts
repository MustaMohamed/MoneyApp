import { create } from 'zustand';

interface CommitmentFormBodyStateShape {
  showStartDatePicker: boolean;
  showEndDatePicker: boolean;
}

interface CommitmentFormBodyState {
  state: CommitmentFormBodyStateShape;
  setShowStartDatePicker: (v: boolean) => void;
  setShowEndDatePicker: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: CommitmentFormBodyStateShape = {
  showStartDatePicker: false,
  showEndDatePicker: false,
};

export const useCommitmentFormBodyState = create<CommitmentFormBodyState>((set) => ({
  state: INITIAL_STATE,
  setShowStartDatePicker: (v) => set((s) => ({ state: { ...s.state, showStartDatePicker: v } })),
  setShowEndDatePicker: (v) => set((s) => ({ state: { ...s.state, showEndDatePicker: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
