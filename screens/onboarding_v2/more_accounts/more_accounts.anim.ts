import { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

export function useMoreAccountsAnim() {
  // Key is 'more_accounts_v2' to avoid collision with existing 'more_accounts' key.
  const play = useFirstMountEntering('more_accounts_v2');

  return {
    checkEntering: play ? ZoomIn.springify().damping(12).stiffness(120) : undefined,
    headlineEntering: play ? FadeInDown.delay(100).duration(280) : undefined,
    subtitleEntering: play ? FadeInDown.delay(180).duration(280) : undefined,
    // isInitialMount=true: stagger by index (rows present on first mount)
    // isInitialMount=false: no stagger (row added after returning from N2)
    rowEntering: (index: number, isInitialMount: boolean) =>
      isInitialMount ? FadeInRight.delay(index * 60).duration(300) : FadeInRight.duration(250),
  };
}
