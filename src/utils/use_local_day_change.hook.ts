import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { toLocalDateString } from '@/utils/format_date';
import { subscribeToLocalDay } from '@/utils/local_day_ticker';

/** Calls `onDayChange` once per local day while its screen is focused: at the focus, at local midnight, or on the return to the foreground. `onDayChange` must be memoised and must not reject. */
export function useLocalDayChange(onDayChange: () => void): void {
  const lastDayRef = useRef(toLocalDateString(new Date()));

  useFocusEffect(
    useCallback(() => {
      const check = (today: string) => {
        if (today === lastDayRef.current) return;
        lastDayRef.current = today;
        onDayChange();
      };

      check(toLocalDateString(new Date()));
      return subscribeToLocalDay(check);
    }, [onDayChange]),
  );
}
