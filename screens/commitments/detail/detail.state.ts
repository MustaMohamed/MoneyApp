import { create } from 'zustand';

interface DetailStateShape {
  skipConfirmVisible: boolean;
  paySheetVisible: boolean;
}

interface CommitmentDetailState {
  state: DetailStateShape;
  setSkipConfirmVisible: (v: boolean) => void;
  setPaySheetVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: DetailStateShape = {
  skipConfirmVisible: false,
  paySheetVisible: false,
};

export const useCommitmentDetailState = create<CommitmentDetailState>((set) => ({
  state: INITIAL_STATE,
  setSkipConfirmVisible: (v) => set((s) => ({ state: { ...s.state, skipConfirmVisible: v } })),
  setPaySheetVisible: (v) => set((s) => ({ state: { ...s.state, paySheetVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
