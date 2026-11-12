import { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

// RNGH 3's swipeable no longer hides its actions at rest, and a row's content is see-through.
export function useRestingActionsHidden(progress: SharedValue<number>) {
  return useAnimatedStyle(() => ({ opacity: progress.value === 0 ? 0 : 1 }));
}
