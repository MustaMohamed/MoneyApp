import { create } from 'zustand';

import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import type { AccountStats } from '@/modules/accounts/database/account_stats';

interface MonthSpendStats {
  totalEgp: number;
  usdNative: number;
  count: number;
}

interface DashboardStoreShape {
  statsMap: Record<string, AccountStats>;
  currentMonthCommitmentPayments: CommitmentPayment[];
  currentMonthSpend: MonthSpendStats;
  previousMonthSpend: MonthSpendStats;
}

interface DashboardStore {
  state: DashboardStoreShape;
  setStatsMap: (m: Record<string, AccountStats>) => void;
  setCurrentMonthCommitmentPayments: (p: CommitmentPayment[]) => void;
  setMonthSpendStats: (current: MonthSpendStats, previous: MonthSpendStats) => void;
  reset: () => void;
}

const EMPTY_SPEND: MonthSpendStats = { totalEgp: 0, usdNative: 0, count: 0 };

const INITIAL_STATE: DashboardStoreShape = {
  statsMap: {},
  currentMonthCommitmentPayments: [],
  currentMonthSpend: EMPTY_SPEND,
  previousMonthSpend: EMPTY_SPEND,
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  state: INITIAL_STATE,
  setStatsMap: (m) => set((s) => ({ state: { ...s.state, statsMap: m } })),
  setCurrentMonthCommitmentPayments: (p) =>
    set((s) => ({ state: { ...s.state, currentMonthCommitmentPayments: p } })),
  setMonthSpendStats: (current, previous) =>
    set((s) => ({
      state: { ...s.state, currentMonthSpend: current, previousMonthSpend: previous },
    })),
  reset: () => set({ state: INITIAL_STATE }),
}));
