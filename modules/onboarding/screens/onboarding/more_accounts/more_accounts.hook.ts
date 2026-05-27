import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

import { OnboardingStep } from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';

export function useMoreAccounts() {
  const router = useRouter();
  const accounts = useAccountStore.useState.accounts();
  const setStep = useOnboardingStore.getState().setStep;

  const initialCountRef = useRef<number>(accounts.length);
  const initialCount = initialCountRef.current;

  useFocusEffect(
    useCallback(() => {
      void useAccountStore.getState().loadAccounts();
    }, []),
  );

  const handleAddAnother = () => {
    router.push({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
  };

  // Renamed from handleDone → handleContinue (spec §2.5); navigates to N4 (was O6)
  const handleContinue = async () => {
    await setStep(OnboardingStep.N4);
    router.push('/(onboarding)/ready');
  };

  return { accounts, initialCount, handleAddAnother, handleContinue };
}
