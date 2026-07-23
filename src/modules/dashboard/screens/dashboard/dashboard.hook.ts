import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { AccountStats } from '@/modules/accounts/database/account_stats';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { BudgetDashboardSummaryVM } from '@/modules/budget/screens/budget/budget.helpers';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import type { DashboardLoadInput } from '@/modules/dashboard/repositories/dashboard.repository';
import { formatMonthYear } from '@/utils/format_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { currentYearMonth, shiftYearMonth } from '@/utils/year_month';

import {
  computeDashboardAccountCounts,
  computeDashboardCommitmentSummary,
  computeDashboardSpendDeltaPct,
  computeLiabilitiesBreakdown,
  computeLiquidityBreakdown,
  computeNetWorth,
  groupAccountsByType,
  type DashboardMonthFacts,
} from './dashboard.helpers';
import { selectDashboardPresentation } from './dashboard.presentation';
import { useDashboardState } from './dashboard.state';
import { useDashboardStore } from './dashboard.store';

const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_STATS_MAP: Record<string, AccountStats> = {};
const EMPTY_COMMITMENT_PAYMENTS: CommitmentPayment[] = [];
const EMPTY_MONTH_FACTS: DashboardMonthFacts = {
  totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
  spend: { totalEgp: 0, usdNative: 0, count: 0 },
};
const EMPTY_BUDGET_SUMMARY: BudgetDashboardSummaryVM = {
  budgeted: 0,
  spent: 0,
  left: 0,
  pct: 0,
  categoryCount: 0,
};

function createDashboardLoadInput(now = new Date()): DashboardLoadInput {
  return { yearMonth: currentYearMonth(now), now };
}

export function useDashboard() {
  const router = useRouter();
  const { snapshot, status, requestedKey } = useDashboardStore(
    useShallow((state) => ({
      snapshot: state.snapshot,
      status: state.status,
      requestedKey: state.requestedKey,
    })),
  );
  const { rate, isManualOverride } = useCurrencyStore(
    useShallow((state) => ({
      rate: state.rate,
      isManualOverride: state.isManualOverride,
    })),
  );
  const { isBreakdownVisible, selectedSegment } = useDashboardState(
    useShallow((state) => ({
      isBreakdownVisible: state.isBreakdownVisible,
      selectedSegment: state.selectedSegment,
    })),
  );
  const setBreakdownVisible = useDashboardState.getState().setBreakdownVisible;
  const setSelectedSegment = useDashboardState.getState().setSelectedSegment;

  useFocusEffect(
    useCallback(() => {
      setSelectedSegment('overview');
      const task = runAfterInteractions(() =>
        useDashboardStore.getState().ensureSnapshot(createDashboardLoadInput()),
      );

      return () => {
        task.cancel();
        useDashboardStore.getState().invalidate();
      };
    }, [setSelectedSegment]),
  );

  const refresh = useCallback(
    () => useDashboardStore.getState().refresh(createDashboardLoadInput()),
    [],
  );
  const retry = useCallback(
    () => useDashboardStore.getState().retry(createDashboardLoadInput()),
    [],
  );

  const presentation = useMemo(
    () => selectDashboardPresentation({ status, snapshot, requestedKey }),
    [requestedKey, snapshot, status],
  );
  const matchingSnapshot = snapshot?.key === requestedKey ? snapshot : undefined;
  const accounts = matchingSnapshot?.accounts ?? EMPTY_ACCOUNTS;
  const statsMap = matchingSnapshot?.statsMap ?? EMPTY_STATS_MAP;
  const currentMonth = matchingSnapshot?.currentMonth ?? EMPTY_MONTH_FACTS;
  const previousMonth = matchingSnapshot?.previousMonth ?? EMPTY_MONTH_FACTS;
  const budgetSummary = matchingSnapshot?.budgetSummary ?? EMPTY_BUDGET_SUMMARY;
  const commitmentPayments = matchingSnapshot?.commitmentPayments ?? EMPTY_COMMITMENT_PAYMENTS;
  const yearMonth = matchingSnapshot?.yearMonth ?? currentYearMonth();
  const previousYearMonth = matchingSnapshot?.previousYearMonth ?? shiftYearMonth(yearMonth, -1);

  const netWorth = useMemo(() => computeNetWorth(accounts, rate), [accounts, rate]);
  const liquidity = useMemo(() => computeLiquidityBreakdown(accounts, rate), [accounts, rate]);
  const liabilities = useMemo(() => computeLiabilitiesBreakdown(accounts, rate), [accounts, rate]);
  const groupedAccounts = useMemo(() => groupAccountsByType(accounts), [accounts]);
  const accountCounts = useMemo(() => computeDashboardAccountCounts(accounts), [accounts]);
  const commitments = useMemo(
    () => computeDashboardCommitmentSummary(commitmentPayments),
    [commitmentPayments],
  );
  const spendDeltaPct = useMemo(
    () => computeDashboardSpendDeltaPct(currentMonth.spend.totalEgp, previousMonth.spend.totalEgp),
    [currentMonth, previousMonth],
  );

  const goToAccount = useCallback((id: string) => router.push(`/accounts/${id}`), [router]);
  const goToAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);
  const goToSettings = useCallback(() => router.push('/settings'), [router]);
  const goToTransactions = useCallback(() => router.push('/(app)/(tabs)/transactions'), [router]);
  const goToBudget = useCallback(() => router.push('/(app)/(tabs)/budget'), [router]);
  const goToCommitments = useCallback(() => router.push('/(app)/(tabs)/commitments'), [router]);

  return {
    state: {
      presentation,
      accounts,
      rate,
      isManualOverride,
      netWorth,
      liquidity,
      liabilities,
      groupedAccounts,
      statsMap,
      isBreakdownVisible,
      selectedSegment,
      monthSpend: {
        currentEgp: currentMonth.spend.totalEgp,
        currentUsdNative: currentMonth.spend.usdNative,
        currentCount: currentMonth.spend.count,
        previousEgp: previousMonth.spend.totalEgp,
        deltaPct: spendDeltaPct,
        yearMonth,
        loading: presentation.cardLoading,
      },
      accountCounts,
      commitments: {
        ...commitments,
        yearMonth,
        loading: presentation.cardLoading,
      },
      transactions: {
        current: currentMonth.totals,
        previous: matchingSnapshot ? previousMonth.totals : null,
        previousLabel: formatMonthYear(previousYearMonth),
        yearMonth,
        loading: presentation.cardLoading,
      },
      budget: {
        summary: budgetSummary,
        yearMonth,
        loading: presentation.cardLoading,
      },
    },
    setBreakdownVisible,
    setSelectedSegment,
    refresh,
    retry,
    goToAccount,
    goToAddAccount,
    goToSettings,
    goToTransactions,
    goToBudget,
    goToCommitments,
  };
}
