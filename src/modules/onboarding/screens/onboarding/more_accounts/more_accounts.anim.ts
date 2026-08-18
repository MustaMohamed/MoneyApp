import { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { ms } from '@/utils/responsive';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

const RISE_DURATION_MS = 500;
const RISE_TRANSLATE_Y = ms(10);
const RISE_DELAYS_MS = [0, 120] as const;

/**
 * Two blocks rise staggered at 0/120ms, opacity + 10pt translate, 500ms,
 * once — spec.md § Motion budget, §3 S6. The intro block (chip, rule,
 * headline, body) and the list block (count slab, group, secondary action)
 * are the whole budget: **the list itself never animates**, on mount or when
 * an account is added to it (S6, N-3).
 *
 * Both hooks are called unconditionally, then combined:
 * `useFirstMountEntering(...) && !useReducedMotion()` would short-circuit the
 * second call, which is a conditional hook call under `react/rules-of-hooks`
 * (`.oxlintrc.json:3`). `welcome.anim.ts:10-20` carries the same note.
 */
/**
 * The one builder chain, written once. `withInitialValues` is what pins the
 * spec's 10pt lift instead of FadeInDown's own preset 25 — Reanimated reads
 * the flat `translateY` key before it reads `transform[index]`
 * (`defaultAnimations/Utils.ts:19-23`), so this shape is the supported one.
 *
 * Duplicated from `welcome.anim.ts` rather than shared: `welcome.anim.ts` is
 * not a file this ticket owns (spec §5.1), and editing it here is an
 * unplanned change. The shared home is an `onboarding_rise.ts` beside
 * `onboarding_broadsheet.tsx` once N4 is the third consumer.
 */
function rise(delayMs: number) {
  return FadeInDown.duration(RISE_DURATION_MS)
    .delay(delayMs)
    .withInitialValues({ translateY: RISE_TRANSLATE_Y });
}

export function useMoreAccountsAnim() {
  const isFirstMount = useFirstMountEntering('more_accounts');
  const reduceMotion = useReducedMotion();
  const play = isFirstMount && !reduceMotion;

  const [introDelay, listDelay] = RISE_DELAYS_MS;

  return {
    introEntering: play ? rise(introDelay) : undefined,
    listEntering: play ? rise(listDelay) : undefined,
  };
}
