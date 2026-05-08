import { create } from 'zustand';

interface AddCommitmentStateShape {
  saving: boolean;
}

interface AddCommitmentState {
  state: AddCommitmentStateShape;
  setSaving: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: AddCommitmentStateShape = { saving: false };

export const useAddCommitmentState = create<AddCommitmentState>((set) => ({
  state: INITIAL_STATE,
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
