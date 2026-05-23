import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { OnboardingStep, SecurityChoice } from '@/constants/enums';
import { useOnboardingStore } from '@/store/onboarding.store';
import { backOrReplace } from '@/utils/onboarding_nav';

import { canProceed } from './security.helpers';
import { useSecurityStore } from './security.store';

export function useSecurity() {
  const router = useRouter();
  const {
    state: onboardingState,
    setStep,
    setSecurityChoice,
  } = useOnboardingStore(
    useShallow((s) => ({
      state: s.state,
      setStep: s.setStep,
      setSecurityChoice: s.setSecurityChoice,
    })),
  );
  const { state: securityState, setSelected } = useSecurityStore(
    useShallow((s) => ({ state: s.state, setSelected: s.setSelected })),
  );

  // Fall back to globally saved choice on cold start / resume
  const selected: SecurityChoice | undefined =
    securityState.selected ?? onboardingState.securityChoice;

  const onContinue = async () => {
    if (!canProceed(selected)) return;
    await setSecurityChoice(selected);
    await setStep(OnboardingStep.O4);
    router.push('/(onboarding)/add_account');
  };

  const onBack = () => backOrReplace(router, '/(onboarding)/currency');

  return { selected, setSelected, onContinue, onBack };
}
