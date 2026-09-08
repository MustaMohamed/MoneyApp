import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useBaseCurrencyStore } from '@/modules/currency/store/base_currency.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useDashboardStore } from '@/modules/dashboard/screens/dashboard/dashboard.store';

import { isRateUsable } from '../../../domain/account_aggregation';
import { useAccountStore } from '../../../store/account.store';
import { resolveAccountCaption, resolveAccountsListContent } from './accounts_list.helpers';
import {
  resolveAccountsListEmptyState,
  resolveAccountsListSectionTitle,
} from './accounts_list.presentation';
import { useAccountsListState } from './accounts_list.state';

/** No focus loader: the store reloads at startup and after every mutation, and Try again is the only reload this screen starts. */
export function useAccountsList() {
  const router = useRouter();
  const { accounts, archivedCount, loadError } = useAccountStore(
    useShallow((s) => ({
      accounts: s.accounts,
      archivedCount: s.archivedCount,
      loadError: s.loadError,
    })),
  );
  const loadAccounts = useAccountStore.getState().loadAccounts;
  const isRetrying = useAccountsListState((s) => s.isRetrying);
  const setRetrying = useAccountsListState.getState().setRetrying;
  const selectedType = useAccountsListState((s) => s.selectedType);
  const setSelectedType = useAccountsListState.getState().setSelectedType;
  const { rate, isManualOverride, rateUpdatedAt } = useCurrencyStore(
    useShallow((state) => ({
      rate: state.rate,
      // `INITIAL_STATE.rate` is 50, so provenance needs both fields, not the rate alone.
      isManualOverride: state.isManualOverride,
      rateUpdatedAt: state.rate_updated_at,
    })),
  );
  const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency);
  // The dashboard's own snapshot, refreshed on its focus; no snapshot means zero figures.
  const statsMap = useDashboardStore((s) => s.snapshot?.statsMap);

  // Decided once here and passed down; never re-derived as `rate > 0` when displaying.
  const rateUsable = isRateUsable({ rate, rateUpdatedAt, isManualOverride });

  const allRows = useMemo(
    () =>
      accounts.map((account) => ({
        account,
        caption: resolveAccountCaption({
          account,
          rate,
          stats: statsMap?.[account.id],
          isRateUsable: rateUsable,
          baseCurrency,
        }),
      })),
    [accounts, baseCurrency, rate, rateUsable, statsMap],
  );

  // A narrow over the same row objects: a filter change re-derives no caption (ADR 2026-09-07).
  const rows = useMemo(
    () =>
      selectedType === 'all' ? allRows : allRows.filter((row) => row.account.type === selectedType),
    [allRows, selectedType],
  );

  const goToAccount = useCallback((id: string) => router.push(`/accounts/${id}`), [router]);
  const goToAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);
  const onBack = useCallback(() => router.back(), [router]);

  const retry = useCallback(async () => {
    if (useAccountsListState.getState().isRetrying) return;
    setRetrying(true);
    try {
      await loadAccounts();
    } catch {
      // The account store owns the retryable error state.
    } finally {
      setRetrying(false);
    }
  }, [loadAccounts, setRetrying]);

  return {
    state: {
      rows,
      archivedCount,
      isRetrying,
      selectedType,
      sectionTitle: resolveAccountsListSectionTitle(selectedType),
      // The unfiltered active count: a filtered-to-empty list is not an empty screen.
      content: resolveAccountsListContent({ loadError, accountCount: allRows.length }),
      emptyState: resolveAccountsListEmptyState({
        activeCount: accounts.length,
        archivedCount,
        visibleCount: rows.length,
      }),
    },
    goToAccount,
    goToAddAccount,
    onBack,
    retry,
    selectType: setSelectedType,
  };
}
