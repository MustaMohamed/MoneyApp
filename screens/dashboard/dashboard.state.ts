import { create } from 'zustand';

interface DashboardStateShape {
  isBreakdownVisible: boolean;
  refreshing: boolean;
}

interface DashboardState {
  state: DashboardStateShape;
  setBreakdownVisible: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: DashboardStateShape = {
  isBreakdownVisible: false,
  refreshing: false,
};

export const useDashboardState = create<DashboardState>((set) => ({
  state: INITIAL_STATE,
  setBreakdownVisible: (v) => set((s) => ({ state: { ...s.state, isBreakdownVisible: v } })),
  setRefreshing: (v) => set((s) => ({ state: { ...s.state, refreshing: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
