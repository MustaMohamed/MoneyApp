import { useCallback } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Row press scale animation, identical contract to V1's transactions.anim.ts.
 * Used by TransactionRow and TransferFlowCard cells.
 */
export function useRowPressScale() {
  const scale = useSharedValue(1);
  const onPressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 100 });
  }, [scale]);
  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 120 });
  }, [scale]);
  return { scale, onPressIn, onPressOut };
}
