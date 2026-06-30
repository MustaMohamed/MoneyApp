import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditCommitmentStateShape {
  saving: boolean;
  deactivateDialogVisible: boolean;
}

type EditCommitmentState = EditCommitmentStateShape & {
  setSaving: (v: boolean) => void;
  setDeactivateDialogVisible: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: EditCommitmentStateShape = {
  saving: false,
  deactivateDialogVisible: false,
};

export const useEditCommitmentState = createMoneyAppSelectors(
  create<EditCommitmentState>((set) => ({
    ...INITIAL_STATE,
    setSaving: (v) => set({ saving: v }),
    setDeactivateDialogVisible: (v) => set({ deactivateDialogVisible: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
