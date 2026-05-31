import { type Href, Redirect } from 'expo-router';

import { type OnboardingStep } from '@/constants/enums';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';

const STEP_HREF: Record<OnboardingStep, Href> = {
  N1: '/(onboarding)/welcome',
  N2: '/(onboarding)/add_account',
  N3: '/(onboarding)/more_accounts',
  N4: '/(onboarding)/ready',
};

export default function Index() {
  const {
    state: { complete, currentStep },
  } = useOnboardingStore();
  if (complete.value) return <Redirect href="/dashboard" />;
  return <Redirect href={STEP_HREF[currentStep.value]} />;
}
