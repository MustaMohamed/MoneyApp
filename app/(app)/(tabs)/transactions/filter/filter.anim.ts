import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useFilterDrawerAnim() {
  const sheetY = useSharedValue(1000);
  const overlay = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
  }));

  function openSheet() {
    overlay.value = withTiming(1, { duration: 250 });
    sheetY.value = withSpring(0, { damping: 22, stiffness: 200 });
  }

  function closeSheet(onDone?: () => void) {
    overlay.value = withTiming(0, { duration: 200 });
    sheetY.value = withTiming(1000, { duration: 260 }, (finished) => {
      'worklet';
      if (finished && onDone) {
        runOnJS(onDone)();
      }
    });
  }

  return { sheetStyle, overlayStyle, openSheet, closeSheet };
}
