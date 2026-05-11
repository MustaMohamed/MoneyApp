import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { Currency, OnboardingStep } from '@/constants/enums';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useWelcomeState } from './welcome.state';

export function useWelcome() {
  const router = useRouter();

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

  const { state: localState, setSelected } = useWelcomeState(
    useShallow((s) => ({ state: s.state, setSelected: s.setSelected })),
  );

  // Fall back to the onboarding store value until the user makes a local selection
  const selected: Currency = localState.selected ?? onboardingState.baseCurrency;

  const onContinue = async () => {
    await setBaseCurrency(selected);
    await setStep(OnboardingStep.N2);
    router.push('/(onboarding)/add_account');
  };

  return { state: { selected }, setSelected, onContinue };
}
