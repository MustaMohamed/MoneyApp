import { Redirect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import {
  ONBOARDING_STEP_HREF,
  resolveOnboardingStep,
} from '@/modules/onboarding/domain/onboarding_route';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';

export default function Index() {
  const { complete, currentStep } = useOnboardingStore(
    useShallow((s) => ({ complete: s.complete, currentStep: s.currentStep })),
  );
  const accountCount = useAccountStore((s) => s.accounts.length);

  if (complete) return <Redirect href="/dashboard" />;
  return <Redirect href={ONBOARDING_STEP_HREF[resolveOnboardingStep(currentStep, accountCount)]} />;
}
