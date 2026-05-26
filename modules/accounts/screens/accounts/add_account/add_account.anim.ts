import {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useAddAccountAnim() {
  const btnScale = useSharedValue(1);

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const triggerBtnPress = () => {
    btnScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1.0, { damping: 10 }),
    );
  };

  return {
    btnAnim,
    triggerBtnPress,
    ccEntering: FadeInDown.duration(250),
    ccExiting: FadeOutUp.duration(200),
    aprEntering: FadeInDown.duration(200),
    aprExiting: FadeOutUp.duration(150),
    errorEntering: FadeInDown.duration(150),
    errorExiting: FadeOutUp.duration(100),
  };
}
