import { create } from 'zustand';

import type { DashboardSegment } from './types';

export type { DashboardSegment };

interface DashboardStateShape {
  isBreakdownVisible: boolean;
  refreshing: boolean;
  selectedSegment: DashboardSegment;
}

interface DashboardState {
  state: DashboardStateShape;
  setBreakdownVisible: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
  setSelectedSegment: (s: DashboardSegment) => void;
  reset: () => void;
}

const INITIAL_STATE: DashboardStateShape = {
  isBreakdownVisible: false,
  refreshing: false,
  selectedSegment: 'overview',
};

export const useDashboardV2State = create<DashboardState>((set) => ({
  state: INITIAL_STATE,
  setBreakdownVisible: (v) => set((s) => ({ state: { ...s.state, isBreakdownVisible: v } })),
  setRefreshing: (v) => set((s) => ({ state: { ...s.state, refreshing: v } })),
  setSelectedSegment: (s) => set((prev) => ({ state: { ...prev.state, selectedSegment: s } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
