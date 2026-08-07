import type { Href } from 'expo-router';

import { OnboardingStep } from '@/constants/enums';

// Moved verbatim from src/app/index.tsx:7-12 (MA-005) so it can be shared
// between the root redirect and every forward transition.
export const ONBOARDING_STEP_HREF: Record<OnboardingStep, Href> = {
  [OnboardingStep.N1]: '/(onboarding)/welcome',
  [OnboardingStep.N2]: '/(onboarding)/add_account',
  [OnboardingStep.N3]: '/(onboarding)/more_accounts',
  [OnboardingStep.N4]: '/(onboarding)/ready',
};

/**
 * Maps a persisted onboarding step and the current (non-archived) account
 * count to the step that is actually reachable. Pure and total — see
 * MA-005 plan Decision 0 for the twelve-row table this implements and how
 * each row maps back to business rules 2, 3 and 4.
 *
 * Runs both at the root redirect (resume) and again on every forward
 * transition, so a destination step can never be one the data does not
 * support — see MA-005 plan Decision 0, "Why the resolver runs on forward
 * transitions and not only on resume".
 */
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
