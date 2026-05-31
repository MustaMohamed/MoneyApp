import { useSignal } from '@preact/signals-react';
import { useRouter } from 'expo-router';

import { Currency, OnboardingStep } from '@/constants/enums';
import { useOnboarding } from '@/modules/onboarding/store/onboarding.store';

export function useWelcome() {
  const { state, setBaseCurrency, setStep } = useOnboarding();
  const router = useRouter();
  const selected = useSignal<Currency>(state.baseCurrency.value);

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
