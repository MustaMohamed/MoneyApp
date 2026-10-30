import { useEffect, useState } from 'react';

import { isRateStale, resolveRateStaleDelayMs } from './currency.helpers';

/** The stale mark of the stored rate, turned at the boundary with no render in between while `isActive`; an inactive turn to active is the next read. */
export function useRateStale(rateUpdatedAt: string | null, isActive: boolean): boolean {
  const [rateStale, setRateStale] = useState(() => isRateStale(rateUpdatedAt, Date.now()));

  useEffect(() => {
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
