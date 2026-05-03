import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';
import { computeNetWorth, groupAccountsByType } from './dashboard.helpers';

export function useDashboard() {
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const rate = useCurrencyStore((s) => s.rate);
  const isManualOverride = useCurrencyStore((s) => s.isManualOverride);

  const [isBreakdownVisible, setBreakdownVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAccounts();
    } finally {
      setRefreshing(false);
    }
  }, [loadAccounts]);

  const netWorth = useMemo(() => computeNetWorth(accounts, rate), [accounts, rate]);
  const groupedAccounts = useMemo(() => groupAccountsByType(accounts), [accounts]);

  const goToAccount = (id: string) => router.push(`/accounts/${id}`);
  const goToAddAccount = () => router.push('/accounts/add_account');
  const goToSettings = () => router.push('/settings');

  return {
    accounts,
    rate,
    isManualOverride,
    netWorth,
    groupedAccounts,
    isBreakdownVisible,
    setBreakdownVisible,
    refreshing,
    refresh,
    goToAccount,
    goToAddAccount,
    goToSettings,
  };
}
