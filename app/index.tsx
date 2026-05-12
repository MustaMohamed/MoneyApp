import { type Href, Redirect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { useOnboardingStore } from '@/store/onboarding.store';
import { type OnboardingStep } from '@/constants/enums';

const STEP_HREF: Record<OnboardingStep, Href> = {
  O1: '/(onboarding)/welcome',
  O2: '/(onboarding)/currency',
  O3: '/(onboarding)/security',
  O4: '/(onboarding)/add_account',
  O5: '/(onboarding)/more_accounts',
  O6: '/(onboarding)/ready',
  // N* steps map to the same routes as their v2 equivalents;
  // conditional dispatchers in those routes render the V2 screen.
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
