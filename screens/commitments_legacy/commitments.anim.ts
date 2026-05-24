import { useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

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
