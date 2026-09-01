import type { Href } from 'expo-router';

import { OnboardingStep } from '@/constants/enums';

export const ONBOARDING_STEP_HREF: Record<OnboardingStep, Href> = {
  [OnboardingStep.N1]: '/(onboarding)/welcome',
  [OnboardingStep.N2]: '/(onboarding)/add_account',
  [OnboardingStep.N3]: '/(onboarding)/more_accounts',
  [OnboardingStep.N4]: '/(onboarding)/ready',
};

/** Clamps a step to what the account count allows; runs on resume and forward transitions. */
export function resolveOnboardingStep(step: OnboardingStep, accountCount: number): OnboardingStep {
  switch (step) {
    case OnboardingStep.N1:
      return OnboardingStep.N1;
    case OnboardingStep.N2:
      return accountCount > 0 ? OnboardingStep.N3 : OnboardingStep.N2;
    case OnboardingStep.N3:
      return accountCount > 0 ? OnboardingStep.N3 : OnboardingStep.N2;
    case OnboardingStep.N4:
      return accountCount > 0 ? OnboardingStep.N4 : OnboardingStep.N2;
  }
}
