import { create } from 'zustand';

interface AddCommitmentStateShape {
  saving: boolean;
  categoryPickerVisible: boolean;
  accountPickerVisible: boolean;
}

interface AddCommitmentState {
  state: AddCommitmentStateShape;
  setSaving: (v: boolean) => void;
  setCategoryPickerVisible: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: AddCommitmentStateShape = {
  saving: false,
  categoryPickerVisible: false,
  accountPickerVisible: false,
};

export const useAddCommitmentState = create<AddCommitmentState>((set) => ({
  state: INITIAL_STATE,
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  setCategoryPickerVisible: (v) =>
    set((s) => ({ state: { ...s.state, categoryPickerVisible: v } })),
  setAccountPickerVisible: (v) => set((s) => ({ state: { ...s.state, accountPickerVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
