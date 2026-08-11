import { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { ms } from '@/utils/responsive';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

const RISE_DURATION_MS = 500;
const RISE_TRANSLATE_Y = ms(10);
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
 */
/**
 * The one builder chain, written once. `withInitialValues` is what pins the
 * spec's 10pt lift instead of FadeInDown's own preset 25 — Reanimated reads
 * the flat `translateY` key before it reads `transform[index]`
 * (`defaultAnimations/Utils.ts:19-23`), so this shape is the supported one.
 * Repeating the chain per block let three of its parameters drift
 * independently; here a change reaches all four blocks or none.
 */
function rise(delayMs: number) {
  return FadeInDown.duration(RISE_DURATION_MS)
    .delay(delayMs)
    .withInitialValues({ translateY: RISE_TRANSLATE_Y });
}

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
