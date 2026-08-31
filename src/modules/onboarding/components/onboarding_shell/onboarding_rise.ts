import { FadeInDown } from 'react-native-reanimated';

import { ms } from '@/utils/responsive';

// Reanimated reads flat `translateY` before `transform[index]`, so this shape pins the 10pt lift.
const RISE_DURATION_MS = 500;
const RISE_TRANSLATE_Y = ms(10);

export function rise(delayMs: number) {
  return FadeInDown.duration(RISE_DURATION_MS)
    .delay(delayMs)
    .withInitialValues({ translateY: RISE_TRANSLATE_Y });
}
