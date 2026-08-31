import type { Href } from 'expo-router';

import type { OnboardingStep } from '@/constants/enums';

import { ONBOARDING_STEP_HREF, resolveOnboardingStep } from './onboarding_route';

export interface OnboardingTransitionApi {
  isCurrent: (session: number) => boolean;
  fail: (session: number, message: string) => void;
  settle: (session: number) => void;
  invalidate: () => void;
}

/** `resolve` is a thunk so it can run after the write; `undefined` means do not navigate. */
export type OnboardingTransitionPersist = (
  resolve: () => OnboardingStep,
  isCurrent: () => boolean,
) => Promise<OnboardingStep | undefined>;

export interface RunOnboardingTransitionParams {
  session: number;
  api: OnboardingTransitionApi;
  navigate: (href: Href) => void;
  desiredStep: OnboardingStep;
  /** Read at call time, never captured at render. */
  readAccountCount: () => number;
  persist: OnboardingTransitionPersist;
  errorMessage: string;
}

/** Persist, then navigate only if the session is still current and the write resolved a step. */
export async function runOnboardingTransition({
  session,
  api,
  navigate,
  desiredStep,
  readAccountCount,
  persist,
  errorMessage,
}: RunOnboardingTransitionParams): Promise<void> {
  const resolve = () => resolveOnboardingStep(desiredStep, readAccountCount());
  const isCurrent = () => api.isCurrent(session);

  let resolved: OnboardingStep | undefined;
  try {
    resolved = await persist(resolve, isCurrent);
  } catch {
    api.fail(session, errorMessage);
    return;
  }

  if (resolved === undefined || !api.isCurrent(session)) return;

  api.invalidate();
  navigate(ONBOARDING_STEP_HREF[resolved]);
}
