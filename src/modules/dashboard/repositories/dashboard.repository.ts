import { getDb } from '@/database/client';
import { getAccountsStats, type AccountStats } from '@/modules/accounts/database/account_stats';
import { getAccounts } from '@/modules/accounts/database/accounts';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { BudgetDashboardSummaryVM } from '@/modules/budget/screens/budget/budget.helpers';
import { getPaymentsByMonth } from '@/modules/commitments/database/commitment_payments';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  getDashboardBudgetLimitRows,
  getDashboardTransactionFactRows,
  resolveDashboardMonthWindow,
} from '@/modules/dashboard/database/dashboard_snapshot';
import {
  buildDashboardBudgetSummary,
  reduceDashboardTransactionFacts,
  type DashboardMonthFacts,
} from '@/modules/dashboard/screens/dashboard/dashboard.helpers';

export type { DashboardMonthFacts };

export interface DashboardSnapshot {
  key: string;
  yearMonth: string;
  previousYearMonth: string;
  accounts: Account[];
  statsMap: Record<string, AccountStats>;
  currentMonth: DashboardMonthFacts;
  previousMonth: DashboardMonthFacts;
  budgetSummary: BudgetDashboardSummaryVM;
  commitmentPayments: CommitmentPayment[];
  loadedAt: number;
}

export interface DashboardLoadInput {
  yearMonth: string;
  now: Date;
}

export type DashboardSnapshotStatus =
  | 'idle'
  | 'initialLoading'
  | 'ready'
  | 'refreshing'
  | 'refreshErrorWithData'
  | 'initialError';

export interface IDashboardRepository {
  getSnapshot(input: DashboardLoadInput): Promise<DashboardSnapshot>;
}

export class DashboardRepository implements IDashboardRepository {
  async getSnapshot({ yearMonth, now }: DashboardLoadInput): Promise<DashboardSnapshot> {
    const db = await getDb();
    const window = resolveDashboardMonthWindow(yearMonth);
    const accounts = await getAccounts(db);

    const [transactionRows, budgetLimits, commitmentPayments, statsMap] = await Promise.all([
      getDashboardTransactionFactRows(db, window),
      getDashboardBudgetLimitRows(db, yearMonth),
      getPaymentsByMonth(db, yearMonth),
      getAccountsStats(
        db,
        accounts.map((account) => account.id),
        now,
      ),
    ]);
    const facts = reduceDashboardTransactionFacts(
      transactionRows,
      window.currentYearMonth,
      window.previousYearMonth,
    );

    return {
      key: yearMonth,
      yearMonth,
      previousYearMonth: window.previousYearMonth,
      accounts,
      statsMap,
      currentMonth: facts.currentMonth,
      previousMonth: facts.previousMonth,
      budgetSummary: buildDashboardBudgetSummary(budgetLimits, facts.currentCategorySpendEgp),
      commitmentPayments,
      loadedAt: now.getTime(),
    };
  }
}

export const dashboardRepository = new DashboardRepository();
