import {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useAccountDetailAnim() {
  const headerScale = useSharedValue(1);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const triggerEditToggle = () => {
    headerScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1.0, { damping: 10 }),
    );
  };

  return {
    headerStyle,
    triggerEditToggle,
    fieldEntering: FadeInDown.duration(200),
    fieldExiting: FadeOutUp.duration(150),
    errorEntering: FadeInDown.duration(150),
    errorExiting: FadeOutUp.duration(100),
  };
}
