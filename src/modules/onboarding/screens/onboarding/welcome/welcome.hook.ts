import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useRouter } from 'expo-router';

import { Currency, OnboardingStep } from '@/constants/enums';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';

export function useWelcome() {
  useSignals();
  const { baseCurrency, setBaseCurrency, setStep } = useOnboardingStore();
  const router = useRouter();
  const selected = useSignal<Currency>(baseCurrency);

  const setSelected = (nextCurrency: Currency) => {
    selected.value = nextCurrency;
  };

  const onContinue = async () => {
    await setBaseCurrency(selected.value);
    await setStep(OnboardingStep.N2);
    router.push('/(onboarding)/add_account');
  };

  return { state: { selected }, setSelected, onContinue };
}
