import { useReducedMotion } from 'react-native-reanimated';

import { rise } from '@/modules/onboarding/components/onboarding_shell/onboarding_rise';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

const RISE_DELAYS_MS = [0, 120, 240] as const;

/** Call both hooks unconditionally; `&&`-ing them inline short-circuits the second hook call. */
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
