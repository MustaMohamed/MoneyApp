import {
  useSharedValue,
  withSpring,
  withTiming,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

export const heroEntering = FadeInDown.duration(300);
export const rowsEntering = FadeInUp.delay(150).duration(300);
export const actionEntering = FadeInUp.delay(250).duration(300);

export function useDeletePressScale() {
  const scale = useSharedValue(1);
  return {
    scale,
    onPressIn: () => {
      scale.value = withTiming(0.97, { duration: 80 });
    },
    onPressOut: () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    },
  };
}
