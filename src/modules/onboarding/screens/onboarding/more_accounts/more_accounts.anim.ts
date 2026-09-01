import { useReducedMotion } from 'react-native-reanimated';

import { rise } from '@/modules/onboarding/components/onboarding_shell/onboarding_rise';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

const RISE_DELAYS_MS = [0, 120] as const;

/** Call both hooks, then combine; `&&` between the calls would short-circuit the second. */
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
