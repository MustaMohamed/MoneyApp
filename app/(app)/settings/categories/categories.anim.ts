import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

export function useTabAnim(isActive: boolean) {
  const progress = useSharedValue(isActive ? 1 : 0);

  const triggerSelect = () => {
    progress.value = withTiming(1, { duration: 200 });
  };

  const triggerDeselect = () => {
    progress.value = withTiming(0, { duration: 200 });
  };

  const tabAnim = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [Colors.dark.surfaceEl, Colors.shared.cairoGold],
    ),
  }));

  return { tabAnim, triggerSelect, triggerDeselect };
}
