import { useReducedMotion } from 'react-native-reanimated';

import { rise } from '@/modules/onboarding/components/onboarding_shell/onboarding_rise';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

const RISE_DELAYS_MS = [0, 120, 240, 360] as const;

/**
 * Four blocks rise staggered at 0/120/240/360ms, opacity + 10pt translate,
 * 500ms, once — spec.md § Motion budget. Both hooks are called
 * unconditionally, then combined: `useFirstMountEntering(...) &&
 * !useReducedMotion()` would short-circuit the second call, which is a
 * conditional hook call under `react/rules-of-hooks` (`.oxlintrc.json:3`).
 *
 * The CTA is not one of the four (MA-010 decision D11) — the motion budget
 * on this screen is the headline block, the body column, the currency
 * block and the trust row, all inside the content viewport; the footer is a
 * fixed track and does not enter.
 *
 * The builder chain itself lives in `onboarding_rise.ts` — duration, lift and
 * `withInitialValues` are identical on N1, N3 and N4; only the delay array,
 * which is the block count, is a screen decision.
 */
export function useWelcomeAnim() {
  const isFirstMount = useFirstMountEntering('welcome');
  const reduceMotion = useReducedMotion();
  const play = isFirstMount && !reduceMotion;

  const [headlineDelay, bodyDelay, currencyDelay, trustDelay] = RISE_DELAYS_MS;

  return {
    headlineEntering: play ? rise(headlineDelay) : undefined,
    bodyEntering: play ? rise(bodyDelay) : undefined,
    currencyEntering: play ? rise(currencyDelay) : undefined,
    trustEntering: play ? rise(trustDelay) : undefined,
  };
}
