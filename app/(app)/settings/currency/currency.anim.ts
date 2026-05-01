import { FadeInDown, FadeOutUp } from 'react-native-reanimated';

export function useCurrencyScreenAnim() {
  return {
    panelEntering: FadeInDown.duration(250),
    panelExiting: FadeOutUp.duration(200),
  };
}
