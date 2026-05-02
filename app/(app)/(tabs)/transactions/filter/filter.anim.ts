import { useCallback } from 'react';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useFilterDrawerAnim() {
  const sheetY = useSharedValue(1000);
  const overlay = useSharedValue(0);
  const applyScale = useSharedValue(1);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
  }));

  const applyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: applyScale.value }],
  }));

  const openSheet = useCallback(() => {
    overlay.value = withTiming(1, { duration: 250 });
    sheetY.value = withSpring(0, { damping: 22, stiffness: 200 });
  }, [overlay, sheetY]);

  const closeSheet = useCallback(
    (onDone?: () => void) => {
      overlay.value = withTiming(0, { duration: 200 });
      sheetY.value = withTiming(1000, { duration: 260 }, (finished) => {
        'worklet';
        if (finished && onDone) {
          runOnJS(onDone)();
        }
      });
    },
    [overlay, sheetY],
  );

  function triggerApply() {
    applyScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1.0, { damping: 12, stiffness: 180 }),
    );
  }

  return { sheetStyle, overlayStyle, openSheet, closeSheet, applyStyle, triggerApply };
}
