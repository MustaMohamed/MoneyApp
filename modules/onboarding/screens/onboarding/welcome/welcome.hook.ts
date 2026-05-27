import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Currency, OnboardingStep } from '@/constants/enums';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';

export function useWelcome() {
  const baseCurrency = useOnboardingStore.useState.baseCurrency();
  const setBaseCurrency = useOnboardingStore.use.setBaseCurrency();
  const setStep = useOnboardingStore.use.setStep();
  const router = useRouter();
  const [selected, setSelected] = useState<Currency>(baseCurrency);

  const onContinue = async () => {
    await setBaseCurrency(selected);
    await setStep(OnboardingStep.N2);
    router.push('/(onboarding)/add_account');
  };

  return { state: { selected }, setSelected, onContinue };
}
