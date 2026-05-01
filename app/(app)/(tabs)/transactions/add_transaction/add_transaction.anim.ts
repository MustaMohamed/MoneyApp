import { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';

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
    sheetY.value = withTiming(1000, { duration: 260 }, (finished) => {
      if (finished && onDone) onDone();
    });
  }

  return { sheetStyle, overlayStyle, openSheet, closeSheet };
}
