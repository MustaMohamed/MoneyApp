import { useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { OnboardingStep } from '@/constants/enums';

export function useMoreAccounts() {
  const router = useRouter();
  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const setStep = useOnboardingStore((s) => s.setStep);

  const initialCountRef = useRef<number>(accountState.accounts.length);
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
    await setStep(OnboardingStep.O6);
    router.push('/(onboarding)/ready');
  };

  return { accounts: accountState.accounts, initialCount, handleAddAnother, handleDone };
}
