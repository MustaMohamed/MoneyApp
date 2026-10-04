import { useBottomSheet } from '@gorhom/bottom-sheet';
import { useCallback } from 'react';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** Reports each rest the sheet reaches, closed (-1) or a snap point, and closes the sheet when `onIndex` answers true; call it from a component inside the sheet's `children`. */
export function useSheetEngineIndex(onIndex: (index: number) => boolean): void {
  const { animatedIndex, close } = useBottomSheet();

  const report = useCallback(
    (index: number) => {
      if (onIndex(index)) close();
    },
    [onIndex, close],
  );

  useAnimatedReaction(
    () => animatedIndex.value,
    (index, previous) => {
      if (index === previous) return;
      if (index === -1 || (index >= 0 && Number.isInteger(index))) scheduleOnRN(report, index);
    },
    [report],
  );
}
