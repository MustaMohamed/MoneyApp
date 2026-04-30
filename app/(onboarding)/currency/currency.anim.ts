import { useEffect } from 'react';
import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useCurrencyRowAnim(isSelected: boolean) {
  const scale = useSharedValue(1);
  const borderProgress = useSharedValue(isSelected ? 1 : 0);
  const checkScale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    if (isSelected) {
      borderProgress.value = withTiming(1, { duration: 200 });
      checkScale.value = withSpring(1, { damping: 12, stiffness: 180 });
    } else {
      borderProgress.value = withTiming(0, { duration: 150 });
      checkScale.value = withTiming(0, { duration: 120 });
    }
  }, [isSelected, borderProgress, checkScale]);

  const triggerRowTap = () => {
    scale.value = withSequence(
      withTiming(1.02, { duration: 80 }),
      withTiming(1.0, { duration: 120 }),
    );
  };

  const rowAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(borderProgress.value, [0, 1], ['#2A3A4F', '#C9973A']),
  }));

  const checkAnim = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return { rowAnim, checkAnim, triggerRowTap };
}
