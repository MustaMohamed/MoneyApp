import { OnboardingStep } from '@/constants/enums';
import {
  ONBOARDING_STEP_HREF,
  resolveOnboardingStep,
} from '@/modules/onboarding/domain/onboarding_route';

describe('resolveOnboardingStep', () => {
  it.each([
    [1, OnboardingStep.N1, 0, OnboardingStep.N1],
    [2, OnboardingStep.N1, 1, OnboardingStep.N1],
    [3, OnboardingStep.N1, 2, OnboardingStep.N1],
    [4, OnboardingStep.N2, 0, OnboardingStep.N2],
    [5, OnboardingStep.N2, 1, OnboardingStep.N3],
    [6, OnboardingStep.N2, 2, OnboardingStep.N3],
    [7, OnboardingStep.N3, 0, OnboardingStep.N2],
    [8, OnboardingStep.N3, 1, OnboardingStep.N3],
    [9, OnboardingStep.N3, 2, OnboardingStep.N3],
    [10, OnboardingStep.N4, 0, OnboardingStep.N2],
    [11, OnboardingStep.N4, 1, OnboardingStep.N4],
    [12, OnboardingStep.N4, 2, OnboardingStep.N4],
  ])('row %i: %s + %i accounts resolves to %s', (_row, step, accountCount, expected) => {
    expect(resolveOnboardingStep(step, accountCount)).toBe(expected);
  });
});

describe('ONBOARDING_STEP_HREF', () => {
  it('has an entry for every OnboardingStep value — a fifth step cannot be added without a route', () => {
    expect(Object.keys(ONBOARDING_STEP_HREF).sort()).toEqual(Object.values(OnboardingStep).sort());
  });
});
