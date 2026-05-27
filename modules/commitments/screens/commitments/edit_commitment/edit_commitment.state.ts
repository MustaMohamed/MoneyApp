import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditCommitmentStateShape {
  saving: boolean;
  deactivateDialogVisible: boolean;
}

interface EditCommitmentState {
  state: EditCommitmentStateShape;
  setSaving: (v: boolean) => void;
  setDeactivateDialogVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: EditCommitmentStateShape = {
  saving: false,
  deactivateDialogVisible: false,
};

export const useEditCommitmentState = createMoneyAppSelectors(
  create<EditCommitmentState>((set) => ({
    state: INITIAL_STATE,
    setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
    setDeactivateDialogVisible: (v) =>
      set((s) => ({ state: { ...s.state, deactivateDialogVisible: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
