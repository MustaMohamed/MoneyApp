import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

import { toLocalDateString } from '@/utils/format_date';

/** Calls `onDayChange` once per local day while its screen is focused: at the focus, at local midnight, or on the return to the foreground. `onDayChange` must be stable and must not reject. */
export function useLocalDayChange(onDayChange: () => void): void {
  const lastDayRef = useRef(toLocalDateString(new Date()));

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const check = () => {
        const today = toLocalDateString(new Date());
        if (today === lastDayRef.current) return;
        lastDayRef.current = today;
        onDayChange();
      };
      const armTimer = () => {
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        timer = setTimeout(
          () => {
            if (AppState.currentState === 'active') check();
            armTimer();
          },
          Math.max(midnight.getTime() - now.getTime(), 1),
        );
      };

      check();
      armTimer();
      const subscription = AppState.addEventListener('change', (status) => {
        if (status === 'active') check();
      });
      return () => {
        clearTimeout(timer);
        subscription.remove();
      };
    }, [onDayChange]),
  );
}
