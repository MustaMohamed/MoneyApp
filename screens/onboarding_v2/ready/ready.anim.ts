import { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

export function useReadyAnim() {
  // Key is 'ready_v2' to avoid collision with existing 'ready' key while
  // both v1 and v2 screens co-exist during the flag=false window (spec R6).
  const play = useFirstMountEntering('ready_v2');

  return {
    checkEntering: play ? ZoomIn.springify().damping(10).stiffness(100) : undefined,
    headlineEntering: play ? FadeInUp.delay(200).duration(400) : undefined,
    subtitleEntering: play ? FadeInUp.delay(300).duration(350) : undefined,
    rowEntering: (index: number) =>
      play ? FadeInUp.delay(400 + index * 80).duration(300) : undefined,
    ctaEntering: play ? FadeInUp.delay(700).duration(400) : undefined,
  };
}
