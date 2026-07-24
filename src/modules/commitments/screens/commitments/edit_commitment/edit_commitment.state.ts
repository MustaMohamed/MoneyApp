import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditCommitmentStateShape {
  saving: boolean;
  saveError?: string;
  deactivateDialogVisible: boolean;
}

type EditCommitmentState = EditCommitmentStateShape & {
  setSaving: (v: boolean) => void;
  setSaveError: (message?: string) => void;
  setDeactivateDialogVisible: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: EditCommitmentStateShape = {
  saving: false,
  saveError: undefined,
  deactivateDialogVisible: false,
};

export const useEditCommitmentState = createMoneyAppSelectors(
  create<EditCommitmentState>((set) => ({
    ...INITIAL_STATE,
    setSaving: (v) => set({ saving: v }),
    setSaveError: (message) => set({ saveError: message }),
    setDeactivateDialogVisible: (v) => set({ deactivateDialogVisible: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
