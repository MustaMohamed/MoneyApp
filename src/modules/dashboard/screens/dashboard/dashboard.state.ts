import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { DashboardSegment } from './types';

export type { DashboardSegment };

interface DashboardStateShape {
  isBreakdownVisible: boolean;
  refreshing: boolean;
  selectedSegment: DashboardSegment;
}

type DashboardState = DashboardStateShape & {
  setBreakdownVisible: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
  setSelectedSegment: (s: DashboardSegment) => void;
  reset: () => void;
};

const INITIAL_STATE: DashboardStateShape = {
  isBreakdownVisible: false,
  refreshing: false,
  selectedSegment: 'overview',
};

export const useDashboardState = createMoneyAppSelectors(
  create<DashboardState>((set) => ({
    ...INITIAL_STATE,
    setBreakdownVisible: (v) => set({ isBreakdownVisible: v }),
    setRefreshing: (v) => set({ refreshing: v }),
    setSelectedSegment: (s) => set({ selectedSegment: s }),
    reset: () => set(INITIAL_STATE),
  })),
);
