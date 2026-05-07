import { create } from 'zustand';

interface CommitmentsScreenStateShape {
  refreshing: boolean;
}

interface CommitmentsScreenState {
  state: CommitmentsScreenStateShape;
  setRefreshing: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: CommitmentsScreenStateShape = {
  refreshing: false,
};

export const useCommitmentsScreenState = create<CommitmentsScreenState>((set) => ({
  state: INITIAL_STATE,
  setRefreshing: (v) => set((s) => ({ state: { ...s.state, refreshing: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
