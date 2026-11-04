import { useEffect, useState } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';

import { toLocalDateString } from '@/utils/format_date';

type DayListener = (today: string) => void;

const listeners = new Set<DayListener>();
let timer: ReturnType<typeof setTimeout> | undefined;
let subscription: NativeEventSubscription | undefined;

// One read of the day for every listener, so all sheets on screen re-render in one batch on one today.
function notify() {
  const today = toLocalDateString(new Date());
  for (const listener of listeners) listener(today);
}

function armTimer() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  timer = setTimeout(
    () => {
      if (AppState.currentState === 'active') notify();
      armTimer();
    },
    Math.max(midnight.getTime() - now.getTime(), 1),
  );
}

function subscribe(listener: DayListener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    armTimer();
    subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active') return;
      notify();
      // RN counts a delay on a clock that stops in deep sleep, so the delay is rebuilt from the wall clock.
      clearTimeout(timer);
      armTimer();
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    clearTimeout(timer);
    timer = undefined;
    subscription?.remove();
    subscription = undefined;
  };
}

/** The local day: `seed` until this activation sees the day change, at local midnight or on the return to the foreground. */
export function useLocalToday(seed: string, isActive: boolean): string;
export function useLocalToday(seed: string | undefined, isActive: boolean): string | undefined;
export function useLocalToday(seed: string | undefined, isActive: boolean): string | undefined {
  const [observed, setObserved] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isActive || seed === undefined) return;
    let baseline = seed;
    const onDay = (today: string) => {
      if (today === baseline) return;
      baseline = today;
      setObserved(today);
    };
    const unsubscribe = subscribe(onDay);
    onDay(toLocalDateString(new Date()));
    return () => {
      unsubscribe();
      setObserved(undefined);
    };
  }, [seed, isActive]);

  return seed === undefined ? undefined : (observed ?? seed);
}
