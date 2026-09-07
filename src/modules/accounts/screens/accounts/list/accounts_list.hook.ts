import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useAccountStore } from '../../../store/account.store';

/** No focus loader: the store reloads after every mutation and at startup. */
export function useAccountsList() {
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);

  const goToAccount = useCallback((id: string) => router.push(`/accounts/${id}`), [router]);
  const goToAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);
  const onBack = useCallback(() => router.back(), [router]);

  return {
    state: { accounts },
    goToAccount,
    goToAddAccount,
    onBack,
  };
}
