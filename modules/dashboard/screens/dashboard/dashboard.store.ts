import { create } from 'zustand';

import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

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

type DashboardStore = DashboardStoreShape & {
  setStatsMap: (m: Record<string, AccountStats>) => void;
  setCurrentMonthCommitmentPayments: (p: CommitmentPayment[]) => void;
  setMonthSpendStats: (current: MonthSpendStats, previous: MonthSpendStats) => void;
  reset: () => void;
};

const EMPTY_SPEND: MonthSpendStats = { totalEgp: 0, usdNative: 0, count: 0 };

const INITIAL_STATE: DashboardStoreShape = {
  statsMap: {},
  currentMonthCommitmentPayments: [],
  currentMonthSpend: EMPTY_SPEND,
  previousMonthSpend: EMPTY_SPEND,
};

export const useDashboardStore = createMoneyAppSelectors(
  create<DashboardStore>((set) => ({
    ...INITIAL_STATE,
    setStatsMap: (m) => set((s) => ({ ...s, statsMap: m })),
    setCurrentMonthCommitmentPayments: (p) =>
      set((s) => ({ ...s, currentMonthCommitmentPayments: p })),
    setMonthSpendStats: (current, previous) =>
      set((s) => ({
        ...s,
        currentMonthSpend: current,
        previousMonthSpend: previous,
      })),
    reset: () => set(INITIAL_STATE),
  })),
);
