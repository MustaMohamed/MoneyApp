import type { Href } from 'expo-router';

import type { OnboardingStep } from '@/constants/enums';

import { ONBOARDING_STEP_HREF, resolveOnboardingStep } from './onboarding_route';

export interface OnboardingTransitionApi {
  isCurrent: (session: number) => boolean;
  fail: (session: number, message: string) => void;
  settle: (session: number) => void;
  invalidate: () => void;
}

/**
 * `resolve` is a thunk, not a precomputed step, so a screen whose account
 * count changes inside its own write (N2's save) can call it *after* the
 * write instead of at render time — see MA-005 plan Decision 2 row 2 for the
 * hard-loop this closes. `isCurrent` lets a persist body with more than one
 * `await` bail between them without writing a step for a session that has
 * already moved on.
 *
 * Returning `undefined` means "do not navigate and do not treat this as a
 * step write" — the concrete shape of "a save cannot be undone by a route
 * that has already gone".
 */
export type OnboardingTransitionPersist = (
  resolve: () => OnboardingStep,
  isCurrent: () => boolean,
) => Promise<OnboardingStep | undefined>;

export interface RunOnboardingTransitionParams {
  session: number;
  api: OnboardingTransitionApi;
  navigate: (href: Href) => void;
  desiredStep: OnboardingStep;
  /** () => number, not a captured value — read at call time, never at render. */
  readAccountCount: () => number;
  persist: OnboardingTransitionPersist;
  errorMessage: string;
}

/**
 * Shared persist-then-replace runner for every onboarding step transition.
 * Order matters and is exactly what MA-005's tests assert: persist, then on
 * rejection fail and stop, then on success navigate only if the session is
 * still the one that started and the write actually resolved a step.
 */
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
