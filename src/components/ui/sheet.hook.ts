import { useCallback, useRef, useState } from 'react';

import {
  createSheetCloseLifecycle,
  settleSheetCloseLifecycle,
  syncSheetCloseLifecycle,
  type SheetCloseLifecycle,
} from './sheet_close_lifecycle';

interface SheetCloseLifecycleHook {
  closeLifecycle: SheetCloseLifecycle;
  handleSheetIndexChange: (index: number) => void;
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
  // The index handler reads the latest render's lifecycle, and a second -1 before the next render finds the close settled.
  const closeLifecycleRef = useRef(closeLifecycle);
  closeLifecycleRef.current = closeLifecycle;

  const handleSheetIndexChange = useCallback(
    (index: number) => {
      const settlement = settleSheetCloseLifecycle(closeLifecycleRef.current, index);
      if (!settlement.shouldComplete) return;
      closeLifecycleRef.current = settlement.lifecycle;
      setStoredLifecycle(settlement.lifecycle);
      onCloseComplete?.();
    },
    [onCloseComplete],
  );

  return { closeLifecycle, handleSheetIndexChange };
}
