import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

/** Apply to an inner `Animated.View` filling the tile so the outer box's layout is untouched. */
export function useAccountTypeTileAnim() {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const tileAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const triggerTileTap = () => {
    if (reducedMotion) return;
    scale.value = withSequence(
      withSpring(1.03, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12 }),
    );
  };

  return { tileAnim, triggerTileTap };
}
