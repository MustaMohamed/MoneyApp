import { useEffect } from 'react';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export function useFilterButtonBadgeAnim(count: number) {
  const badgeScale = useSharedValue(1);

  useEffect(() => {
    if (count > 0) {
      badgeScale.value = 1.2;
      badgeScale.value = withSpring(1.0, { damping: 10, stiffness: 180 });
    }
  }, [count, badgeScale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  return { badgeStyle };
}
