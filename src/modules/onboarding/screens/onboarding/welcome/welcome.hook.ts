import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Currency, OnboardingStep } from '@/constants/enums';
import { useOnboarding } from '@/modules/onboarding/store/onboarding.store';

export function useWelcome() {
  const { state, setBaseCurrency, setStep } = useOnboarding();
  const router = useRouter();
  const [selected, setSelected] = useState<Currency>(state.baseCurrency.value);

  const onContinue = async () => {
    await setBaseCurrency(selected);
    await setStep(OnboardingStep.N2);
    router.push('/(onboarding)/add_account');
  };

  return { state: { selected }, setSelected, onContinue };
}
