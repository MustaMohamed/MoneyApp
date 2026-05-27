import { FadeInUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export function useDashboardAnim() {
  const heroOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(16);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  const startEntrance = () => {
    heroOpacity.value = withTiming(1, { duration: 400 });
    heroTranslateY.value = withTiming(0, { duration: 400 });
  };

  return {
    heroStyle,
    startEntrance,
    statsEntering: FadeInUp.delay(150).duration(300),
    sectionEntering: (index: number) => FadeInUp.delay(250 + index * 80).duration(300),
  };
}
