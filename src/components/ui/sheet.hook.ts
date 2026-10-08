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
  handleSheetAnimate: (fromIndex: number) => void;
}

// The fields a render reads: a report that changes none of them, `openReported` alone, stays in the ref and schedules no render.
const RENDERED_FIELDS = ['isOpen', 'hasOpened', 'completed', 'restsClosed'] as const;

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
      const previous = closeLifecycleRef.current;
      closeLifecycleRef.current = settlement.lifecycle;
      if (RENDERED_FIELDS.some((field) => settlement.lifecycle[field] !== previous[field])) {
        setStoredLifecycle(settlement.lifecycle);
      }
      if (settlement.shouldComplete) onCloseComplete?.();
    },
    [onCloseComplete],
  );

  const handleSheetClosed = useCallback(() => handleSheetIndexChange(-1), [handleSheetIndexChange]);

  // gorhom starts an animation from the index it holds, so a start from 0 or more reports this open as that index does.
  const handleSheetAnimate = useCallback(
    (fromIndex: number) => {
      if (fromIndex >= 0) handleSheetIndexChange(fromIndex);
    },
    [handleSheetIndexChange],
  );

  // gorhom reported the closed position while `isOpen` still read true, so nothing reports it again after the drop.
  const settlesOnDrop = !isOpen && closeLifecycle.restsClosed;
  useEffect(() => {
    if (settlesOnDrop) handleSheetIndexChange(-1);
  }, [settlesOnDrop, handleSheetIndexChange]);

  return { closeLifecycle, handleSheetIndexChange, handleSheetClosed, handleSheetAnimate };
}
