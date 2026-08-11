import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

/**
 * account_type_selector.tsx's spring pop on tile selection — spec.md §
 * Motion budget, the only N2 entry in the flow's three-animation budget.
 * Applied to an inner Animated.View filling the tile so the outer box's
 * layout (and the zero-shift contract) is untouched. Skipped entirely under
 * reduced motion — "neither of the first two runs at all" (spec.md § Motion
 * budget); the spinner is the third and is unaffected.
 *
 * useAccountFormAnim (the credit block's FadeInDown/FadeOutUp) and
 * useCreditCardFieldsAnim (the APR reveal's) are deleted, not replaced —
 * decision 11. The credit block is permanently mounted as of this task
 * (credit_card_slot.tsx), so there is nothing left to enter or exit; a
 * layout animation on a block whose whole job is not moving anything above
 * it is the wrong tool regardless, and the motion budget only allows three
 * animations for the whole flow.
 */
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
