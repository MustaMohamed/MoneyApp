import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AccountType, CommitmentPaymentStatus } from '@/constants/enums';
import { getDb } from '@/database/client';
import { getAccountsStats } from '@/modules/accounts/database/account_stats';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import {
  type BudgetDashboardSummaryVM,
  computeBudgetSummaryForMonth,
} from '@/modules/budget/screens/budget/budget.helpers';
import { commitmentRepository } from '@/modules/commitments/repositories/commitment.repository';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import {
  getMonthExpenseStats,
  getPeriodTotals,
} from '@/modules/transactions/database/transactions';
import { formatMonthYear, toLocalDateString } from '@/utils/format_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';

import {
  computeLiabilitiesBreakdown,
  computeLiquidityBreakdown,
  computeNetWorth,
  groupAccountsByType,
} from './dashboard.helpers';
import { useDashboardState } from './dashboard.state';
import { useDashboardStore } from './dashboard.store';

function getCurrentYearMonth(): string {
  return toLocalDateString(new Date()).slice(0, 7);
}

function resolveMonthRange(yearMonth: string): { from: string; to: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0);
  return {
    from: `${yearMonth}-01`,
    to: `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(
      lastDay.getDate(),
    ).padStart(2, '0')}`,
  };
}

const EMPTY_MONTH_SPEND = { totalEgp: 0, usdNative: 0, count: 0 };
const EMPTY_TRANSACTION_TOTALS = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };
const EMPTY_BUDGET_SUMMARY: BudgetDashboardSummaryVM = {
  budgeted: 0,
  spent: 0,
  left: 0,
  pct: 0,
  categoryCount: 0,
};

export function useDashboard() {
  const router = useRouter();

  const { accounts, accountsLoaded } = useAccountStore(
    useShallow((s) => ({ accounts: s.accounts, accountsLoaded: s.hasLoaded })),
  );
  const loadAccounts = useAccountStore.getState().loadAccounts;
  const { rate, isManualOverride } = useCurrencyStore(
    useShallow((s) => ({
      rate: s.rate,
      isManualOverride: s.isManualOverride,
    })),
  );
  const currentYearMonth = useMemo(() => getCurrentYearMonth(), []);
  const { isBreakdownVisible, refreshing, selectedSegment } = useDashboardState(
    useShallow((s) => ({
      isBreakdownVisible: s.isBreakdownVisible,
      refreshing: s.refreshing,
      selectedSegment: s.selectedSegment,
    })),
  );
  const setBreakdownVisible = useDashboardState.getState().setBreakdownVisible;
  const setRefreshing = useDashboardState.getState().setRefreshing;
  const setSelectedSegment = useDashboardState.getState().setSelectedSegment;
  const {
    statsMap,
    currentMonthCommitmentPayments,
    currentMonthSpend,
    previousMonthSpend,
    currentTransactionTotals,
    previousTransactionTotals,
    currentBudgetSummary,
    commitmentPaymentsLoaded,
    monthSpendLoaded,
    transactionTotalsLoaded,
    budgetSummaryLoaded,
  } = useDashboardStore(
    useShallow((s) => ({
      statsMap: s.statsMap,
      currentMonthCommitmentPayments: s.currentMonthCommitmentPayments,
      currentMonthSpend: s.currentMonthSpend,
      previousMonthSpend: s.previousMonthSpend,
      currentTransactionTotals: s.currentTransactionTotals,
      previousTransactionTotals: s.previousTransactionTotals,
      currentBudgetSummary: s.currentBudgetSummary,
      commitmentPaymentsLoaded: s.commitmentPaymentsLoaded,
      monthSpendLoaded: s.monthSpendLoaded,
      transactionTotalsLoaded: s.transactionTotalsLoaded,
      budgetSummaryLoaded: s.budgetSummaryLoaded,
    })),
  );
  const setStatsMap = useDashboardStore.getState().setStatsMap;
  const setCurrentMonthCommitmentPayments =
    useDashboardStore.getState().setCurrentMonthCommitmentPayments;
  const setMonthSpendStats = useDashboardStore.getState().setMonthSpendStats;
  const setTransactionTotals = useDashboardStore.getState().setTransactionTotals;
  const setBudgetSummary = useDashboardStore.getState().setBudgetSummary;

  const previousYearMonth = useMemo(() => {
    const [y, m] = currentYearMonth.split('-').map(Number);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    return `${prevY}-${String(prevM).padStart(2, '0')}`;
  }, [currentYearMonth]);

  const loadMonthSpend = useCallback(async () => {
    try {
      const db = await getDb();
      const [current, previous] = await Promise.all([
        getMonthExpenseStats(db, currentYearMonth),
        getMonthExpenseStats(db, previousYearMonth),
      ]);
      setMonthSpendStats(current, previous);
    } catch (err) {
      console.error('[dashboard] loadMonthSpend failed:', err);
      setMonthSpendStats(EMPTY_MONTH_SPEND, EMPTY_MONTH_SPEND);
    }
  }, [currentYearMonth, previousYearMonth, setMonthSpendStats]);

  const loadTransactionTotals = useCallback(async () => {
    try {
      const db = await getDb();
      const [current, previous] = await Promise.all([
        getPeriodTotals(db, resolveMonthRange(currentYearMonth)),
        getPeriodTotals(db, resolveMonthRange(previousYearMonth)),
      ]);
      setTransactionTotals(current, previous);
    } catch (err) {
      console.error('[dashboard] loadTransactionTotals failed:', err);
      setTransactionTotals(EMPTY_TRANSACTION_TOTALS, EMPTY_TRANSACTION_TOTALS);
    }
  }, [currentYearMonth, previousYearMonth, setTransactionTotals]);

  const loadBudgetSummary = useCallback(async () => {
    try {
      const [rows, spendByMonth] = await Promise.all([
        budgetRepository.getRows(),
        budgetRepository.getSpendByMonth([currentYearMonth]),
      ]);
      setBudgetSummary(computeBudgetSummaryForMonth(rows, spendByMonth, currentYearMonth));
    } catch (err) {
      console.error('[dashboard] loadBudgetSummary failed:', err);
      setBudgetSummary(EMPTY_BUDGET_SUMMARY);
    }
  }, [currentYearMonth, setBudgetSummary]);

  const loadCurrentMonthCommitmentPayments = useCallback(async () => {
    try {
      const payments = await commitmentRepository.getPaymentsForMonth(currentYearMonth);
      setCurrentMonthCommitmentPayments(payments);
    } catch (err) {
      console.error('[dashboard] loadCurrentMonthCommitmentPayments failed:', err);
      setCurrentMonthCommitmentPayments([]);
    }
  }, [currentYearMonth, setCurrentMonthCommitmentPayments]);

  useFocusEffect(
    useCallback(() => {
      setSelectedSegment('overview');
      const task = runAfterInteractions(() => {
        void loadCurrentMonthCommitmentPayments();
        void loadMonthSpend();
        void loadTransactionTotals();
        void loadBudgetSummary();
      });
      return () => task.cancel();
    }, [
      loadCurrentMonthCommitmentPayments,
      loadBudgetSummary,
      loadMonthSpend,
      loadTransactionTotals,
      setSelectedSegment,
    ]),
  );

  const loadStats = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) {
        setStatsMap({});
        return;
      }
      try {
        const db = await getDb();
        const result = await getAccountsStats(db, ids);
        setStatsMap(result);
      } catch (err) {
        console.error('[dashboard] loadStats failed:', err);
      }
    },
    [setStatsMap],
  );

  useEffect(() => {
    void loadStats(accounts.map((a) => a.id));
  }, [accounts, loadStats]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadAccounts(),
        loadCurrentMonthCommitmentPayments(),
        loadBudgetSummary(),
        loadMonthSpend(),
        loadTransactionTotals(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    loadAccounts,
    loadCurrentMonthCommitmentPayments,
    loadBudgetSummary,
    loadMonthSpend,
    loadTransactionTotals,
    setRefreshing,
  ]);

  const netWorth = useMemo(() => computeNetWorth(accounts, rate), [accounts, rate]);
  const liquidity = useMemo(() => computeLiquidityBreakdown(accounts, rate), [accounts, rate]);
  const liabilities = useMemo(() => computeLiabilitiesBreakdown(accounts, rate), [accounts, rate]);
  const groupedAccounts = useMemo(() => groupAccountsByType(accounts), [accounts]);

  const spendDeltaPct = useMemo(() => {
    const prev = previousMonthSpend.totalEgp;
    const curr = currentMonthSpend.totalEgp;
    if (prev <= 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  }, [currentMonthSpend, previousMonthSpend]);

  const accountCounts = useMemo(() => {
    let assets = 0;
    let liabilitiesCount = 0;
    for (const a of accounts) {
      if (a.is_archived) continue;
      if (a.type === AccountType.CreditCard) liabilitiesCount++;
      else assets++;
    }
    return { assets, liabilities: liabilitiesCount };
  }, [accounts]);

  const commitmentCounts = useMemo(() => {
    let paid = 0;
    let overdue = 0;
    let due = 0;
    let upcoming = 0;
    let skipped = 0;
    for (const p of currentMonthCommitmentPayments) {
      switch (p.status) {
        case CommitmentPaymentStatus.Paid:
          paid++;
          break;
        case CommitmentPaymentStatus.Overdue:
          overdue++;
          break;
        case CommitmentPaymentStatus.Due:
          due++;
          break;
        case CommitmentPaymentStatus.Upcoming:
          upcoming++;
          break;
        case CommitmentPaymentStatus.Skipped:
          skipped++;
          break;
      }
    }
    return { paid, overdue, due, upcoming, skipped, total: paid + overdue + due + upcoming };
  }, [currentMonthCommitmentPayments]);

  const commitmentTotalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of currentMonthCommitmentPayments) {
      if (p.status === CommitmentPaymentStatus.Skipped) continue;
      const isPaid = p.status === CommitmentPaymentStatus.Paid;
      const value = isPaid ? (p.amount_paid ?? p.amount_due) : p.amount_due;
      if (value == null) continue;
      totals.set(p.currency, (totals.get(p.currency) ?? 0) + value);
    }
    return totals;
  }, [currentMonthCommitmentPayments]);

  const goToAccount = useCallback((id: string) => router.push(`/accounts/${id}`), [router]);
  const goToAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);
  const goToSettings = useCallback(() => router.push('/settings'), [router]);
  const goToTransactions = useCallback(() => router.push('/(app)/(tabs)/transactions'), [router]);
  const goToBudget = useCallback(() => router.push('/(app)/(tabs)/budget'), [router]);
  const goToCommitments = useCallback(() => router.push('/(app)/(tabs)/commitments'), [router]);

  return {
    state: {
      accounts,
      accountsLoaded,
      rate,
      isManualOverride,
      netWorth,
      liquidity,
      liabilities,
      groupedAccounts,
      statsMap,
      isBreakdownVisible,
      refreshing,
      selectedSegment,
      monthSpend: {
        currentEgp: currentMonthSpend.totalEgp,
        currentUsdNative: currentMonthSpend.usdNative,
        currentCount: currentMonthSpend.count,
        previousEgp: previousMonthSpend.totalEgp,
        deltaPct: spendDeltaPct,
        yearMonth: currentYearMonth,
        loading: !monthSpendLoaded,
      },
      accountCounts,
      commitments: {
        counts: commitmentCounts,
        totalsByCurrency: commitmentTotalsByCurrency,
        yearMonth: currentYearMonth,
        loading: !commitmentPaymentsLoaded,
      },
      transactions: {
        current: currentTransactionTotals,
        previous: previousTransactionTotals,
        previousLabel: formatMonthYear(previousYearMonth),
        yearMonth: currentYearMonth,
        loading: !transactionTotalsLoaded,
      },
      budget: {
        summary: currentBudgetSummary,
        yearMonth: currentYearMonth,
        loading: !budgetSummaryLoaded,
      },
    },
    setBreakdownVisible,
    setSelectedSegment,
    refresh,
    goToAccount,
    goToAddAccount,
    goToSettings,
    goToTransactions,
    goToBudget,
    goToCommitments,
  };
}
