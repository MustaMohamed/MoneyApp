import { useLayoutEffect, useState } from 'react';

import { isRateStale, resolveRateStaleDelayMs } from '../store/currency.helpers';

/** The stale mark of the stored rate, turned at the boundary with no render in between while `isActive`; an inactive turn to active is the next read. */
export function useRateStale(rateUpdatedAt: string | null, isActive: boolean): boolean {
  const [rateStale, setRateStale] = useState(() => isRateStale(rateUpdatedAt, Date.now()));

  // Before paint: a Rate row mounted by the turn to active must not draw the old mark for a frame.
  useLayoutEffect(() => {
    if (!isActive) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => {
      const nowMs = Date.now();
      setRateStale(isRateStale(rateUpdatedAt, nowMs));
      const delayMs = resolveRateStaleDelayMs(rateUpdatedAt, nowMs);
      if (delayMs !== undefined) timer = setTimeout(read, delayMs);
    };
    read();
    return () => clearTimeout(timer);
  }, [rateUpdatedAt, isActive]);

  return rateStale;
}
