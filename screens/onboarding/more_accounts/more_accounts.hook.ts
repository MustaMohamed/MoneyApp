import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { OnboardingStep } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';

export function useMoreAccounts() {
  const router = useRouter();
  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { setStep } = useOnboardingStore(useShallow((s) => ({ setStep: s.setStep })));

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
