import { type Href, Redirect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { type OnboardingStep } from '@/constants/enums';
import { useOnboardingStore } from '@/store/onboarding.store';

const STEP_HREF: Record<OnboardingStep, Href> = {
  N1: '/(onboarding)/welcome',
  N2: '/(onboarding)/add_account',
  N3: '/(onboarding)/more_accounts',
  N4: '/(onboarding)/ready',
};

export default function Index() {
  const { state } = useOnboardingStore(useShallow((s) => ({ state: s.state })));
  if (state.complete) return <Redirect href="/dashboard" />;
  return <Redirect href={STEP_HREF[state.currentStep]} />;
}
