import { act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

type ChangeListener = (status: AppStateStatus) => void;

/** Pins `new Date()` and `Date.now()` at `now` while every timer stays real. */
export function pinDate(now: Date): void {
  jest.useFakeTimers({
    now,
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
}

/** Runs the fake timers up to `moment` in one act. */
export async function advanceTo(moment: Date): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(moment.getTime() - Date.now());
  });
}

/** Spies on `AppState.addEventListener`, starts the app `active`, and returns the live listeners with a state setter and an emitter. */
export function mockAppStateListeners() {
  const listeners = new Set<ChangeListener>();
  const setState = (status: AppStateStatus) => {
    Reflect.set(AppState, 'currentState', status);
  };
  setState('active');
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  });
  return {
    listeners,
    setState,
    emit: (status: AppStateStatus) => {
      setState(status);
      for (const listener of [...listeners]) listener(status);
    },
  };
}
