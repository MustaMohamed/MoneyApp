import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';

import { getDb } from '@/database/client';
import { getAccountsStats } from '@/database/account_stats';
import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useDashboardState } from './dashboard.state';
import { useDashboardStore } from './dashboard.store';
import { computeNetWorth, groupAccountsByType } from './dashboard.helpers';

export function useDashboard() {
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const rate = useCurrencyStore((s) => s.rate);
  const isManualOverride = useCurrencyStore((s) => s.isManualOverride);

  const isBreakdownVisible = useDashboardState((s) => s.state.isBreakdownVisible);
  const setBreakdownVisible = useDashboardState((s) => s.setBreakdownVisible);
  const refreshing = useDashboardState((s) => s.state.refreshing);
  const setRefreshing = useDashboardState((s) => s.setRefreshing);
  const statsMap = useDashboardStore((s) => s.state.statsMap);
  const setStatsMap = useDashboardStore((s) => s.setStatsMap);

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
    loadStats(accounts.map((a) => a.id));
  }, [accounts]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAccounts();
    } finally {
      setRefreshing(false);
    }
  }, [loadAccounts, setRefreshing]);

  const netWorth = useMemo(() => computeNetWorth(accounts, rate), [accounts, rate]);
  const groupedAccounts = useMemo(() => groupAccountsByType(accounts), [accounts]);

  const goToAccount = (id: string) => router.push(`/accounts/${id}`);
  const goToAddAccount = () => router.push('/accounts/add_account');
  const goToSettings = () => router.push('/settings');

  return {
    state: {
      accounts,
      rate,
      isManualOverride,
      netWorth,
      groupedAccounts,
      statsMap,
      isBreakdownVisible,
      refreshing,
    },
    setBreakdownVisible,
    refresh,
    goToAccount,
    goToAddAccount,
    goToSettings,
  };
}
