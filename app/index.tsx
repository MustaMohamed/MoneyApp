import { Redirect } from 'expo-router';

import { useOnboardingStore } from '@/store/onboarding.store';
import { type OnboardingStep } from '@/constants/enums';

const STEP_HREF: Record<OnboardingStep, string> = {
  O1: '/(onboarding)/welcome',
  O2: '/(onboarding)/currency',
  O3: '/(onboarding)/security',
  O4: '/(onboarding)/add_account',
  O5: '/(onboarding)/more_accounts',
  O6: '/(onboarding)/ready',
};

export default function Index() {
  const complete = useOnboardingStore((s) => s.complete);
  const step = useOnboardingStore((s) => s.currentStep);
  if (complete) return <Redirect href="/dashboard" />;
  return <Redirect href={STEP_HREF[step]} />;
}
