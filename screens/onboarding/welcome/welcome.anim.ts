import { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

export function useWelcomeAnim() {
  const play = useFirstMountEntering('welcome');

  return {
    illustrationEntering: play ? FadeInDown.duration(600) : undefined,
    headlineEntering: play ? FadeInUp.delay(400).duration(500) : undefined,
    ctaEntering: play ? FadeInUp.delay(600).duration(400) : undefined,
  };
}
