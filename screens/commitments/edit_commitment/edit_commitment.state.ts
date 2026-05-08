import { create } from 'zustand';

interface EditCommitmentStateShape {
  saving: boolean;
  categoryPickerVisible: boolean;
  accountPickerVisible: boolean;
  deactivateDialogVisible: boolean;
}

interface EditCommitmentState {
  state: EditCommitmentStateShape;
  setSaving: (v: boolean) => void;
  setCategoryPickerVisible: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  setDeactivateDialogVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: EditCommitmentStateShape = {
  saving: false,
  categoryPickerVisible: false,
  accountPickerVisible: false,
  deactivateDialogVisible: false,
};

export const useEditCommitmentState = create<EditCommitmentState>((set) => ({
  state: INITIAL_STATE,
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  setCategoryPickerVisible: (v) =>
    set((s) => ({ state: { ...s.state, categoryPickerVisible: v } })),
  setAccountPickerVisible: (v) => set((s) => ({ state: { ...s.state, accountPickerVisible: v } })),
  setDeactivateDialogVisible: (v) =>
    set((s) => ({ state: { ...s.state, deactivateDialogVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
