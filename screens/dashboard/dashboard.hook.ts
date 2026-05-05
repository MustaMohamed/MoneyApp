import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { getDb } from '@/database/client';
import { getAccountsStats } from '@/database/account_stats';
import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useDashboardState } from './dashboard.state';
import { useDashboardStore } from './dashboard.store';
import { computeNetWorth, groupAccountsByType } from './dashboard.helpers';

export function useDashboard() {
  const router = useRouter();

  const { state: accountState, loadAccounts } = useAccountStore(
    useShallow((s) => ({ state: s.state, loadAccounts: s.loadAccounts })),
  );
  const { state: currencyState } = useCurrencyStore(useShallow((s) => ({ state: s.state })));
  const {
    state: dashUiState,
    setBreakdownVisible,
    setRefreshing,
  } = useDashboardState(
    useShallow((s) => ({
      state: s.state,
      setBreakdownVisible: s.setBreakdownVisible,
      setRefreshing: s.setRefreshing,
    })),
  );
  const { state: dashDataState, setStatsMap } = useDashboardStore(
    useShallow((s) => ({ state: s.state, setStatsMap: s.setStatsMap })),
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
    loadStats(accountState.accounts.map((a) => a.id));
  }, [accountState.accounts]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAccounts();
    } finally {
      setRefreshing(false);
    }
  }, [loadAccounts, setRefreshing]);

  const netWorth = useMemo(
    () => computeNetWorth(accountState.accounts, currencyState.rate),
    [accountState.accounts, currencyState.rate],
  );
  const groupedAccounts = useMemo(
    () => groupAccountsByType(accountState.accounts),
    [accountState.accounts],
  );

  const goToAccount = (id: string) => router.push(`/accounts/${id}`);
  const goToAddAccount = () => router.push('/accounts/add_account');
  const goToSettings = () => router.push('/settings');

  return {
    state: {
      accounts: accountState.accounts,
      rate: currencyState.rate,
      isManualOverride: currencyState.isManualOverride,
      netWorth,
      groupedAccounts,
      statsMap: dashDataState.statsMap,
      isBreakdownVisible: dashUiState.isBreakdownVisible,
      refreshing: dashUiState.refreshing,
    },
    setBreakdownVisible,
    refresh,
    goToAccount,
    goToAddAccount,
    goToSettings,
  };
}
