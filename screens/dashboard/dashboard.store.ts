import { create } from 'zustand';

import type { AccountStats } from '@/database/account_stats';

interface DashboardStoreShape {
  statsMap: Record<string, AccountStats>;
}

interface DashboardStore {
  state: DashboardStoreShape;
  setStatsMap: (m: Record<string, AccountStats>) => void;
  reset: () => void;
}

const INITIAL_STATE: DashboardStoreShape = {
  statsMap: {},
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  state: INITIAL_STATE,
  setStatsMap: (m) => set((s) => ({ state: { ...s.state, statsMap: m } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
