import { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

export function useWelcomeAnim() {
  const play = useFirstMountEntering('welcome');

  return {
    illustrationEntering: play ? FadeInDown.duration(280) : undefined,
    headlineEntering: play ? FadeInUp.delay(80).duration(320) : undefined,
    pillsEntering: play ? FadeInUp.delay(160).duration(300) : undefined,
    ctaEntering: play ? FadeInUp.delay(200).duration(400) : undefined,
  };
}
