import { create } from 'zustand';

interface DetailStateShape {
  skipConfirmVisible: boolean;
}

interface CommitmentDetailState {
  state: DetailStateShape;
  setSkipConfirmVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: DetailStateShape = {
  skipConfirmVisible: false,
};

export const useCommitmentDetailState = create<CommitmentDetailState>((set) => ({
  state: INITIAL_STATE,
  setSkipConfirmVisible: (v) => set((s) => ({ state: { ...s.state, skipConfirmVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
