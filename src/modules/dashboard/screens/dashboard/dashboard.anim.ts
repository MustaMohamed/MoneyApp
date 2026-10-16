import { useEffect, useRef } from 'react';
import {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const HERO_ENTRANCE_MS = 400;
const HERO_RISE_DP = 16;
const HERO_ENTERING = FadeInDown.duration(HERO_ENTRANCE_MS).withInitialValues({
  translateY: HERO_RISE_DP,
});

export function useDashboardAnim() {
  const isOpeningRender = useRef(true);
  const heroOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(16);

  useEffect(() => {
    isOpeningRender.current = false;
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  const startEntrance = () => {
    heroOpacity.value = withTiming(1, { duration: 400 });
    heroTranslateY.value = withTiming(0, { duration: 400 });
  };

  return {
    // Reanimated reads `entering` only when a view mounts, so only a hero mounted in Home's first render enters.
    heroEntering: isOpeningRender.current ? HERO_ENTERING : undefined,
    heroStyle,
    startEntrance,
    statsEntering: FadeInUp.delay(150).duration(300),
    sectionEntering: (index: number) => FadeInUp.delay(250 + index * 80).duration(300),
  };
}
