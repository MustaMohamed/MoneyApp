import { useEffect } from 'react';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';

export function useCommitmentsAnim() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
  }, [opacity, translateY]);

  return { opacity, translateY };
}
