import { create } from 'zustand';

import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';
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
  currentTransactionTotals: PeriodTotals;
  previousTransactionTotals: PeriodTotals | null;
}

type DashboardStore = DashboardStoreShape & {
  setStatsMap: (m: Record<string, AccountStats>) => void;
  setCurrentMonthCommitmentPayments: (p: CommitmentPayment[]) => void;
  setMonthSpendStats: (current: MonthSpendStats, previous: MonthSpendStats) => void;
  setTransactionTotals: (current: PeriodTotals, previous: PeriodTotals) => void;
  reset: () => void;
};

const EMPTY_SPEND: MonthSpendStats = { totalEgp: 0, usdNative: 0, count: 0 };
const EMPTY_TOTALS: PeriodTotals = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };

const INITIAL_STATE: DashboardStoreShape = {
  statsMap: {},
  currentMonthCommitmentPayments: [],
  currentMonthSpend: EMPTY_SPEND,
  previousMonthSpend: EMPTY_SPEND,
  currentTransactionTotals: EMPTY_TOTALS,
  previousTransactionTotals: null,
};

export const useDashboardStore = createMoneyAppSelectors(
  create<DashboardStore>((set) => ({
    ...INITIAL_STATE,
    setStatsMap: (m) => set({ statsMap: m }),
    setCurrentMonthCommitmentPayments: (p) => set({ currentMonthCommitmentPayments: p }),
    setMonthSpendStats: (current, previous) =>
      set({
        currentMonthSpend: current,
        previousMonthSpend: previous,
      }),
    setTransactionTotals: (current, previous) =>
      set({
        currentTransactionTotals: current,
        previousTransactionTotals: previous,
      }),
    reset: () => set(INITIAL_STATE),
  })),
);
