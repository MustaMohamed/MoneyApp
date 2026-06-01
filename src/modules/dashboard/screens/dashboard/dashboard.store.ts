import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import type { AccountStats } from '@/modules/accounts/database/account_stats';

interface MonthSpendStats {
  totalEgp: number;
  usdNative: number;
  count: number;
}

type DashboardSignalState = {
  statsMap: ReadonlySignal<Record<string, AccountStats>>;
  currentMonthCommitmentPayments: ReadonlySignal<CommitmentPayment[]>;
  currentMonthSpend: ReadonlySignal<MonthSpendStats>;
  previousMonthSpend: ReadonlySignal<MonthSpendStats>;
};

type DashboardStoreActions = {
  setStatsMap: (m: Record<string, AccountStats>) => void;
  setCurrentMonthCommitmentPayments: (p: CommitmentPayment[]) => void;
  setMonthSpendStats: (current: MonthSpendStats, previous: MonthSpendStats) => void;
  reset: () => void;
};

const EMPTY_SPEND: MonthSpendStats = { totalEgp: 0, usdNative: 0, count: 0 };

export class DashboardStore implements DashboardStoreActions {
  private readonly statsMap = signal<Record<string, AccountStats>>({});
  private readonly currentMonthCommitmentPayments = signal<CommitmentPayment[]>([]);
  private readonly currentMonthSpend = signal(EMPTY_SPEND);
  private readonly previousMonthSpend = signal(EMPTY_SPEND);

  readonly state: DashboardSignalState = {
    statsMap: this.statsMap,
    currentMonthCommitmentPayments: this.currentMonthCommitmentPayments,
    currentMonthSpend: this.currentMonthSpend,
    previousMonthSpend: this.previousMonthSpend,
  };

  setStatsMap = (m: Record<string, AccountStats>) => {
    this.statsMap.value = m;
  };

  setCurrentMonthCommitmentPayments = (p: CommitmentPayment[]) => {
    this.currentMonthCommitmentPayments.value = p;
  };

  setMonthSpendStats = (current: MonthSpendStats, previous: MonthSpendStats) => {
    batch(() => {
      this.currentMonthSpend.value = current;
      this.previousMonthSpend.value = previous;
    });
  };

  reset = () => {
    batch(() => {
      this.statsMap.value = {};
      this.currentMonthCommitmentPayments.value = [];
      this.currentMonthSpend.value = EMPTY_SPEND;
      this.previousMonthSpend.value = EMPTY_SPEND;
    });
  };
}

const dashboardStore = new DashboardStore();

export function useDashboardStore(): DashboardStore {
  return dashboardStore;
}
