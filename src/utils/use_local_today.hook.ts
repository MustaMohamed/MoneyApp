import { useEffect, useState } from 'react';

import { toLocalDateString } from '@/utils/format_date';
import { subscribeToLocalDay } from '@/utils/local_day_ticker';

/** The local day: `seed` until this activation sees the day change, at local midnight or on the return to the foreground. */
export function useLocalToday(seed: string, isActive: boolean): string;
export function useLocalToday(seed: string | undefined, isActive: boolean): string | undefined;
export function useLocalToday(seed: string | undefined, isActive: boolean): string | undefined {
  const [observed, setObserved] = useState<{ seed: string; day: string } | undefined>(undefined);
  const observedDay = observed !== undefined && observed.seed === seed ? observed.day : undefined;

  useEffect(() => {
    if (!isActive || seed === undefined) return;
    let baseline = observedDay ?? seed;
    const onDay = (today: string) => {
      if (today === baseline) return;
      baseline = today;
      setObserved({ seed, day: today });
    };
    const unsubscribe = subscribeToLocalDay(onDay);
    onDay(toLocalDateString(new Date()));
    return unsubscribe;
  }, [seed, isActive, observedDay]);

  return observedDay ?? seed;
}
