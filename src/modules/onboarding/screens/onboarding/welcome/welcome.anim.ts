import { useReducedMotion } from 'react-native-reanimated';

import { rise } from '@/modules/onboarding/components/onboarding_shell/onboarding_rise';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

const RISE_DELAYS_MS = [0, 120, 240, 360] as const;

/** Call both hooks unconditionally; `&&` would short-circuit into a conditional hook call. */
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
