import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createSheetCloseLifecycle,
  settleSheetCloseLifecycle,
  syncSheetCloseLifecycle,
  type SheetCloseLifecycle,
} from './sheet_close_lifecycle';

interface SheetCloseLifecycleHook {
  closeLifecycle: SheetCloseLifecycle;
  handleSheetIndexChange: (index: number) => void;
  handleSheetClosed: () => void;
}

/** Holds the sheet's close lifecycle as state, so the render after a settled close reads it; `onCloseComplete` runs once per settled close. */
export function useSheetCloseLifecycle(
  isOpen: boolean,
  onCloseComplete: (() => void) | undefined,
): SheetCloseLifecycleHook {
  const [storedLifecycle, setStoredLifecycle] = useState(() => createSheetCloseLifecycle(isOpen));
  const closeLifecycle =
    storedLifecycle.isOpen === isOpen
      ? storedLifecycle
      : syncSheetCloseLifecycle(storedLifecycle, isOpen);
  // `isOpen` is a prop: its change is stored during render, so the lifecycle never lags it by a commit.
  if (closeLifecycle !== storedLifecycle) setStoredLifecycle(closeLifecycle);
  // The handlers read the ref, which alone holds a reported open, so a render writes it only with a change of `isOpen`.
  const closeLifecycleRef = useRef(closeLifecycle);
  if (closeLifecycle !== storedLifecycle) closeLifecycleRef.current = closeLifecycle;

  const handleSheetIndexChange = useCallback(
    (index: number) => {
      const settlement = settleSheetCloseLifecycle(closeLifecycleRef.current, index);
      if (settlement.lifecycle === closeLifecycleRef.current) return;
      // No render reads `openReported`, so a report that changes it alone schedules none.
      const wasAtRest = closeLifecycleRef.current.restsClosed;
      closeLifecycleRef.current = settlement.lifecycle;
      if (settlement.shouldComplete || settlement.lifecycle.restsClosed !== wasAtRest) {
        setStoredLifecycle(settlement.lifecycle);
      }
      if (settlement.shouldComplete) onCloseComplete?.();
    },
    [onCloseComplete],
  );

  const handleSheetClosed = useCallback(() => handleSheetIndexChange(-1), [handleSheetIndexChange]);

  // gorhom reported the closed position while `isOpen` still read true, so nothing reports it again after the drop.
  const settlesOnDrop = !isOpen && closeLifecycle.restsClosed;
  useEffect(() => {
    if (settlesOnDrop) handleSheetIndexChange(-1);
  }, [settlesOnDrop, handleSheetIndexChange]);

  return { closeLifecycle, handleSheetIndexChange, handleSheetClosed };
}
