import { useEffect, useRef } from 'react';
import { FadeInDown, FadeInUp } from 'react-native-reanimated';

const HERO_ENTRANCE_MS = 400;
const HERO_RISE_DP = 16;
const HERO_ENTERING = FadeInDown.duration(HERO_ENTRANCE_MS).withInitialValues({
  translateY: HERO_RISE_DP,
});

export function useDashboardAnim() {
  const isOpeningRender = useRef(true);

  useEffect(() => {
    isOpeningRender.current = false;
  }, []);

  return {
    // Reanimated reads `entering` only when a view mounts, so only a hero mounted in Home's first render enters.
    heroEntering: isOpeningRender.current ? HERO_ENTERING : undefined,
    statsEntering: FadeInUp.delay(150).duration(300),
    sectionEntering: (index: number) => FadeInUp.delay(250 + index * 80).duration(300),
  };
}
