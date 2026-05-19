import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Currency, OnboardingStep } from '@/constants/enums';
import { useOnboardingStore } from '@/store/onboarding.store';

export function useWelcome() {
  const {
    state: onboardingState,
    setBaseCurrency,
    setStep,
  } = useOnboardingStore(
    useShallow((s) => ({
      state: s.state,
      setBaseCurrency: s.setBaseCurrency,
      setStep: s.setStep,
    })),
  );
  const router = useRouter();
  const [selected, setSelected] = useState<Currency>(onboardingState.baseCurrency);

  const onContinue = async () => {
    await setBaseCurrency(selected);
    await setStep(OnboardingStep.N2);
    router.push('/(onboarding)/add_account');
  };

  return { state: { selected }, setSelected, onContinue };
}
