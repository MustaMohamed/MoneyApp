import { useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

/**
 * Press-feedback for a transaction row. Returns a shared value that the
 * row's animated style multiplies into its scale transform.
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

/**
 * Press-feedback for a filter chip — a brief pop, then settle.
 */
export function useChipPressScale() {
  const scale = useSharedValue(1);
  return {
    scale,
    pop: () => {
      scale.value = withSequence(
        withTiming(1.05, { duration: 100 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
    },
  };
}
