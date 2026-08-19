import { FadeInDown } from 'react-native-reanimated';

import { ms } from '@/utils/responsive';

/**
 * The onboarding rise — the one builder chain every Broadsheet screen enters
 * with, written once.
 *
 * N1 (four blocks), N3 (two) and N4 (three) all play opacity + a 10pt lift over
 * 500ms, staggered 120ms apart — spec.md § Motion budget. The delays stay local
 * to each screen because the block COUNT is a screen decision; the chain is not.
 *
 * `withInitialValues` is what pins the spec's 10pt lift instead of FadeInDown's
 * own preset 25 — Reanimated reads the flat `translateY` key before it reads
 * `transform[index]` (`defaultAnimations/Utils.ts:19-23`), so this shape is the
 * supported one. Dropping it is issue #233's regression, and it survives this
 * move: the three screens' anim suites assert `initialValues` directly.
 *
 * This file is the shared home `more_accounts.anim.ts` nominated when it had to
 * duplicate the chain — "once N4 is the third consumer". N4 is that consumer.
 */
export const RISE_DURATION_MS = 500;
export const RISE_TRANSLATE_Y = ms(10);

export function rise(delayMs: number) {
  return FadeInDown.duration(RISE_DURATION_MS)
    .delay(delayMs)
    .withInitialValues({ translateY: RISE_TRANSLATE_Y });
}
