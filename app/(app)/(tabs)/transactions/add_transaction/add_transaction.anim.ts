import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useAddTransactionAnim() {
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
    // The completion callback runs on the UI worklet thread. To call back into
    // a JS-side closure (e.g. onClose from the parent), bridge via runOnJS.
    sheetY.value = withTiming(1000, { duration: 260 }, (finished) => {
      'worklet';
      if (finished && onDone) {
        runOnJS(onDone)();
      }
    });
  }

  return { sheetStyle, overlayStyle, openSheet, closeSheet };
}
