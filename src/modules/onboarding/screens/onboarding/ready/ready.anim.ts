import { useReducedMotion } from 'react-native-reanimated';

import { rise } from '@/modules/onboarding/components/onboarding_shell/onboarding_rise';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

const RISE_DELAYS_MS = [0, 120, 240] as const;

/**
 * Three blocks rise staggered at 0/120/240ms, opacity + 10pt translate, 500ms,
 * once — spec.md § Motion budget, and mockup.html:2325/2332/2342, which mark
 * `.rise-1` (the intro block), `.rise-2` (the hero card) and `.rise-3` (the
 * summary group). Nothing else on this screen enters: the CTA lives in the
 * shell's fixed footer track (the same call MA-010 recorded as D11 for N1),
 * and the summary rows never animate individually.
 *
 * Both hooks are called unconditionally, then combined:
 * `useFirstMountEntering(...) && !useReducedMotion()` would short-circuit the
 * second call, which is a conditional hook call under `react/rules-of-hooks`
 * (`.oxlintrc.json`). `welcome.anim.ts` and `more_accounts.anim.ts` carry the
 * same note.
 *
 * The builder chain lives in `onboarding_rise.ts` — duration, lift and
 * `withInitialValues` are identical on N1, N3 and N4; only the delay array,
 * which is the block count, is a screen decision.
 */
export function useReadyAnim() {
  const isFirstMount = useFirstMountEntering('ready');
  const reduceMotion = useReducedMotion();
  const play = isFirstMount && !reduceMotion;

  const [introDelay, heroDelay, summaryDelay] = RISE_DELAYS_MS;

  return {
    introEntering: play ? rise(introDelay) : undefined,
    heroEntering: play ? rise(heroDelay) : undefined,
    summaryEntering: play ? rise(summaryDelay) : undefined,
  };
}
