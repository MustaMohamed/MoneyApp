import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AccountType, CommitmentPaymentStatus } from '@/constants/enums';
import { getDb } from '@/database/client';
import { getAccountsStats } from '@/modules/accounts/database/account_stats';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { commitmentRepository } from '@/modules/commitments/repositories/commitment.repository';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { getMonthExpenseStats } from '@/modules/transactions/database/transactions';
import { toLocalDateString } from '@/utils/format_date';

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

export function useDashboard() {
  const router = useRouter();

  const { accounts, accountsLoaded, loadAccounts } = useAccountStore(
    useShallow((s) => ({
      accounts: s.state.accounts,
      accountsLoaded: s.state.hasLoaded,
      loadAccounts: s.loadAccounts,
    })),
  );
  const { rate, isManualOverride } = useCurrencyStore(
    useShallow((s) => ({
      rate: s.state.rate,
      isManualOverride: s.state.isManualOverride,
    })),
  );
  const currentYearMonth = useMemo(() => getCurrentYearMonth(), []);
  const {
    state: dashUiState,
    setBreakdownVisible,
    setRefreshing,
    setSelectedSegment,
  } = useDashboardState(
    useShallow((s) => ({
      state: s.state,
      setBreakdownVisible: s.setBreakdownVisible,
      setRefreshing: s.setRefreshing,
      setSelectedSegment: s.setSelectedSegment,
    })),
  );
  const {
    state: dashDataState,
    setStatsMap,
    setCurrentMonthCommitmentPayments,
    setMonthSpendStats,
  } = useDashboardStore(
    useShallow((s) => ({
      state: s.state,
      setStatsMap: s.setStatsMap,
      setCurrentMonthCommitmentPayments: s.setCurrentMonthCommitmentPayments,
      setMonthSpendStats: s.setMonthSpendStats,
    })),
  );

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
    }
  }, [currentYearMonth, previousYearMonth, setMonthSpendStats]);

  const loadCurrentMonthCommitmentPayments = useCallback(async () => {
    try {
      const payments = await commitmentRepository.getPaymentsForMonth(currentYearMonth);
      setCurrentMonthCommitmentPayments(payments);
    } catch (err) {
      console.error('[dashboard] loadCurrentMonthCommitmentPayments failed:', err);
    }
  }, [currentYearMonth, setCurrentMonthCommitmentPayments]);

  useFocusEffect(
    useCallback(() => {
      void loadCurrentMonthCommitmentPayments();
      void loadMonthSpend();
      setSelectedSegment('overview');
    }, [loadCurrentMonthCommitmentPayments, loadMonthSpend, setSelectedSegment]),
  );

  useEffect(() => {
    void loadMonthSpend();
  }, [loadMonthSpend, accounts]);

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
      await Promise.all([loadAccounts(), loadCurrentMonthCommitmentPayments(), loadMonthSpend()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadAccounts, loadCurrentMonthCommitmentPayments, loadMonthSpend, setRefreshing]);

  const netWorth = useMemo(() => computeNetWorth(accounts, rate), [accounts, rate]);
  const liquidity = useMemo(() => computeLiquidityBreakdown(accounts, rate), [accounts, rate]);
  const liabilities = useMemo(() => computeLiabilitiesBreakdown(accounts, rate), [accounts, rate]);
  const groupedAccounts = useMemo(() => groupAccountsByType(accounts), [accounts]);

  const spendDeltaPct = useMemo(() => {
    const prev = dashDataState.previousMonthSpend.totalEgp;
    const curr = dashDataState.currentMonthSpend.totalEgp;
    if (prev <= 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  }, [dashDataState.currentMonthSpend, dashDataState.previousMonthSpend]);

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
    for (const p of dashDataState.currentMonthCommitmentPayments) {
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
  }, [dashDataState.currentMonthCommitmentPayments]);

  const commitmentTotalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of dashDataState.currentMonthCommitmentPayments) {
      if (p.status === CommitmentPaymentStatus.Skipped) continue;
      const isPaid = p.status === CommitmentPaymentStatus.Paid;
      const value = isPaid ? (p.amount_paid ?? p.amount_due) : p.amount_due;
      if (value == null) continue;
      totals.set(p.currency, (totals.get(p.currency) ?? 0) + value);
    }
    return totals;
  }, [dashDataState.currentMonthCommitmentPayments]);

  const goToAccount = useCallback((id: string) => router.push(`/accounts/${id}`), [router]);
  const goToAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);
  const goToSettings = useCallback(() => router.push('/settings'), [router]);
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
      statsMap: dashDataState.statsMap,
      isBreakdownVisible: dashUiState.isBreakdownVisible,
      refreshing: dashUiState.refreshing,
      selectedSegment: dashUiState.selectedSegment,
      monthSpend: {
        currentEgp: dashDataState.currentMonthSpend.totalEgp,
        currentUsdNative: dashDataState.currentMonthSpend.usdNative,
        currentCount: dashDataState.currentMonthSpend.count,
        previousEgp: dashDataState.previousMonthSpend.totalEgp,
        deltaPct: spendDeltaPct,
        yearMonth: currentYearMonth,
      },
      accountCounts,
      commitments: {
        counts: commitmentCounts,
        totalsByCurrency: commitmentTotalsByCurrency,
        yearMonth: currentYearMonth,
      },
    },
    setBreakdownVisible,
    setSelectedSegment,
    refresh,
    goToAccount,
    goToAddAccount,
    goToSettings,
    goToCommitments,
  };
}
