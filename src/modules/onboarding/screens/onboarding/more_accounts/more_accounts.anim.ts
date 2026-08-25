import { useReducedMotion } from 'react-native-reanimated';

import { rise } from '@/modules/onboarding/components/onboarding_shell/onboarding_rise';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

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
 * (`.oxlintrc.json:3`). `welcome.anim.ts` carries the same note.
 *
 * The builder chain moved to `onboarding_rise.ts`, the shared home this file's
 * own note nominated for it once N4 became the third consumer.
 *
 * `hasAccounts` threads through as `useFirstMountEntering`'s `claim` (#247):
 * E3, the empty state, renders with `hasAccounts=false` and claims nothing,
 * so the `'more_accounts'` key stays unclaimed through it; the first populated
 * render — a fresh mount via `router.replace`, `add_account.hook.ts:62` —
 * still gets to animate instead of finding the key already burned by a screen
 * that never showed the list at all.
 */
export function useMoreAccountsAnim(hasAccounts: boolean) {
  const isFirstMount = useFirstMountEntering('more_accounts', hasAccounts);
  const reduceMotion = useReducedMotion();
  const play = isFirstMount && !reduceMotion;

  const [introDelay, listDelay] = RISE_DELAYS_MS;

  return {
    introEntering: play ? rise(introDelay) : undefined,
    listEntering: play ? rise(listDelay) : undefined,
  };
}
