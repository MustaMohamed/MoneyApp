import { FadeInDown, FadeOutUp } from 'react-native-reanimated';

export function useAccountFormAnim() {
  return {
    ccEntering: FadeInDown.duration(250),
    ccExiting: FadeOutUp.duration(200),
    aprEntering: FadeInDown.duration(200),
    aprExiting: FadeOutUp.duration(150),
  };
}
