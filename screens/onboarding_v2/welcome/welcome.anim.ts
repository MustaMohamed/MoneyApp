import { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

export function useWelcomeAnim() {
  // Key is 'welcome_v2' to avoid collision with the old 'welcome' key
  // while both v1 and v2 screens co-exist during the flag=false window.
  const play = useFirstMountEntering('welcome_v2');

  return {
    illustrationEntering: play ? FadeInDown.duration(280) : undefined,
    headlineEntering: play ? FadeInUp.delay(80).duration(320) : undefined,
    pillsEntering: play ? FadeInUp.delay(160).duration(300) : undefined,
    ctaEntering: play ? FadeInUp.delay(200).duration(400) : undefined,
  };
}
