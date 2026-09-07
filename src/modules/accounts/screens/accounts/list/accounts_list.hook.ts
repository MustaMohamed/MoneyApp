import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '../../../store/account.store';
import { resolveAccountsListContent } from './accounts_list.helpers';
import { useAccountsListState } from './accounts_list.state';

/** No focus loader: the store reloads at startup and after every mutation, and Try again is the only reload this screen starts. */
export function useAccountsList() {
  const router = useRouter();
  const { accounts, loadError } = useAccountStore(
    useShallow((s) => ({ accounts: s.accounts, loadError: s.loadError })),
  );
  const loadAccounts = useAccountStore.getState().loadAccounts;
  const isRetrying = useAccountsListState((s) => s.isRetrying);
  const setRetrying = useAccountsListState.getState().setRetrying;

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
      accounts,
      loadError,
      isRetrying,
      content: resolveAccountsListContent({ loadError, accountCount: accounts.length }),
    },
    goToAccount,
    goToAddAccount,
    onBack,
    retry,
  };
}
