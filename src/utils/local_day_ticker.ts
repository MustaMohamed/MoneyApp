import { AppState, type EventSubscription } from 'react-native';

import { toLocalDateString } from '@/utils/format_date';

type DayListener = (today: string) => void;

const listeners = new Set<DayListener>();
let timer: ReturnType<typeof setTimeout> | undefined;
let armedMidnight: number | undefined;
let subscription: EventSubscription | undefined;

// One read of the day for every listener, so all sheets on screen re-render in one batch on one today.
function notify() {
  const today = toLocalDateString(new Date());
  for (const listener of listeners) listener(today);
}

function armTimer() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  armedMidnight = midnight.getTime();
  timer = setTimeout(
    () => {
      if (AppState.currentState === 'active') notify();
      armTimer();
    },
    Math.max(midnight.getTime() - now.getTime(), 1),
  );
}

/** Calls `listener` with the local day at each local midnight and on each return to the foreground; returns the unsubscribe. */
export function subscribeToLocalDay(listener: DayListener): () => void {
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
  } else if (armedMidnight !== undefined && armedMidnight > Date.now()) {
    // A later subscribe rebuilds the delay from the wall clock, but a timer already due still runs.
    clearTimeout(timer);
    armTimer();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    clearTimeout(timer);
    timer = undefined;
    armedMidnight = undefined;
    subscription?.remove();
    subscription = undefined;
  };
}
