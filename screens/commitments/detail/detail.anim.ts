import { FadeInDown, FadeInUp } from 'react-native-reanimated';

export const heroEntering = FadeInDown.duration(300);
export const cardEntering = FadeInUp.delay(150).duration(300);
export const historyEntering = FadeInUp.delay(250).duration(300);
