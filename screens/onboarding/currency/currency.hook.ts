import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { Currency, OnboardingStep } from '@/constants/enums';
import { useOnboardingStore } from '@/store/onboarding.store';
import { backOrReplace } from '@/utils/onboarding_nav';

import { useCurrencyStore } from './currency.store';

export function useCurrency() {
  const router = useRouter();
  const {
    state: onboardingState,
    setStep,
    setBaseCurrency,
  } = useOnboardingStore(
    useShallow((s) => ({
      state: s.state,
      setStep: s.setStep,
      setBaseCurrency: s.setBaseCurrency,
    })),
  );
  const { state: localCurrState, setSelected } = useCurrencyStore(
    useShallow((s) => ({ state: s.state, setSelected: s.setSelected })),
  );

  // Fall back to global store value until the user makes a local selection
  const selected: Currency = localCurrState.selected ?? onboardingState.baseCurrency;

  const onContinue = async () => {
    await setBaseCurrency(selected);
    await setStep(OnboardingStep.O3);
    router.push('/(onboarding)/security');
  };

  const onBack = () => backOrReplace(router, '/(onboarding)/welcome');

  return { selected, setSelected, onContinue, onBack };
}
