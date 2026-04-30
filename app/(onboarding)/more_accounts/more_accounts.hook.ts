import { useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAccountStore } from '@/store/account_store';
import { useOnboardingStore } from '@/store/onboarding_store';

export function useMoreAccounts() {
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const setStep = useOnboardingStore((s) => s.setStep);

  const initialCountRef = useRef<number | null>(null);
  if (initialCountRef.current === null) {
    initialCountRef.current = accounts.length;
  }
  const initialCount = initialCountRef.current;

  useFocusEffect(
    useCallback(() => {
      useAccountStore.getState().loadAccounts();
    }, []),
  );

  const handleAddAnother = () => {
    router.push({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
  };

  const handleDone = async () => {
    await setStep('O6');
    router.push('/(onboarding)/ready');
  };

  return { accounts, initialCount, handleAddAnother, handleDone };
}
