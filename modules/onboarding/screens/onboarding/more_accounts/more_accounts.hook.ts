import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { OnboardingStep } from '@/constants/enums';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useAccountStore } from '@/store/account.store';

export function useMoreAccounts() {
  const router = useRouter();
  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { setStep } = useOnboardingStore(useShallow((s) => ({ setStep: s.setStep })));

  const initialCountRef = useRef<number>(accountState.accounts.length);
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

  return { accounts: accountState.accounts, initialCount, handleAddAnother, handleContinue };
}
