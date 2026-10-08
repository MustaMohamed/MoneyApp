import { useCallback, useEffect, useRef } from 'react';

/** Asks for one animation frame at a time: a request made while a frame waits is dropped, and the unmount cancels the waiting frame. */
export function usePendingFrame(): (run: () => void) => void {
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | undefined>(undefined);

  useEffect(
    () => () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return useCallback((run: () => void) => {
    if (frameRef.current !== undefined) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      run();
    });
  }, []);
}
