import { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

/**
 * Press-feedback for a commitment row. Mirrors useRowPressScale from
 * transactions.anim — scale down slightly on press, spring back on release.
 */
export function useRowPressScale() {
  const scale = useSharedValue(1);
  return {
    scale,
    onPressIn: () => {
      scale.value = withTiming(0.98, { duration: 80 });
    },
    onPressOut: () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    },
  };
}
