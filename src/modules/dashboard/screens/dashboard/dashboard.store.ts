import { makeAutoObservable } from 'mobx';

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

const EMPTY_SPEND: MonthSpendStats = { totalEgp: 0, usdNative: 0, count: 0 };

const INITIAL_STATE: DashboardStoreShape = {
  statsMap: {},
  currentMonthCommitmentPayments: [],
  currentMonthSpend: EMPTY_SPEND,
  previousMonthSpend: EMPTY_SPEND,
};

export class DashboardStore {
  statsMap: Record<string, AccountStats> = INITIAL_STATE.statsMap;
  currentMonthCommitmentPayments: CommitmentPayment[] =
    INITIAL_STATE.currentMonthCommitmentPayments;
  currentMonthSpend: MonthSpendStats = INITIAL_STATE.currentMonthSpend;
  previousMonthSpend: MonthSpendStats = INITIAL_STATE.previousMonthSpend;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setStatsMap(m: Record<string, AccountStats>) {
    this.statsMap = m;
  }

  setCurrentMonthCommitmentPayments(p: CommitmentPayment[]) {
    this.currentMonthCommitmentPayments = p;
  }

  setMonthSpendStats(current: MonthSpendStats, previous: MonthSpendStats) {
    this.currentMonthSpend = current;
    this.previousMonthSpend = previous;
  }

  reset() {
    this.statsMap = INITIAL_STATE.statsMap;
    this.currentMonthCommitmentPayments = INITIAL_STATE.currentMonthCommitmentPayments;
    this.currentMonthSpend = INITIAL_STATE.currentMonthSpend;
    this.previousMonthSpend = INITIAL_STATE.previousMonthSpend;
  }
}

export const dashboardStore = new DashboardStore();

export function useDashboardStore(): DashboardStore {
  return dashboardStore;
}
