import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useLocalDayChange } from '@/utils/use_local_day_change.hook';
import { useLocalToday } from '@/utils/use_local_today.hook';

let mockFocused = true;

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      const focused = mockFocused;
      useEffect(() => (focused ? effect() : undefined), [effect, focused]);
    },
  };
});

type ChangeListener = (status: AppStateStatus) => void;

const MINUTE_MS = 60_000;
const changeListeners = new Set<ChangeListener>();
let setTimeoutSpy: jest.SpyInstance;
let clearTimeoutSpy: jest.SpyInstance;

function setAppState(status: AppStateStatus) {
  (AppState as { currentState: AppStateStatus }).currentState = status;
}

function emitAppState(status: AppStateStatus) {
  setAppState(status);
  for (const listener of [...changeListeners]) listener(status);
}

// React's own short timers share the fake clock, so only a timer set past a minute is the day timer.
function armedDayTimers() {
  const cleared = clearTimeoutSpy.mock.calls.map(([timer]) => timer);
  return setTimeoutSpy.mock.calls.filter(
    ([, delay], index) =>
      (delay ?? 0) > MINUTE_MS && !cleared.includes(setTimeoutSpy.mock.results[index].value),
  ).length;
}

async function advanceTo(moment: Date) {
  await act(async () => {
    jest.advanceTimersByTime(moment.getTime() - Date.now());
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
  clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
  mockFocused = true;
  changeListeners.clear();
  setAppState('active');
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    const changeListener = listener as ChangeListener;
    changeListeners.add(changeListener);
    return { remove: () => changeListeners.delete(changeListener) };
  });
});

afterEach(() => {
  setTimeoutSpy.mockRestore();
  clearTimeoutSpy.mockRestore();
  jest.useRealTimers();
});

describe('useLocalDayChange', () => {
  it.each([
    ['2026-10-31', 2026, 9, 31],
    ['2026-12-31', 2026, 11, 31],
    ['2027-02-28', 2027, 1, 28],
    ['2028-02-28', 2028, 1, 28],
    ['2028-02-29', 2028, 1, 29],
  ])(
    'fires once at the midnight after %s with no focus event, and again at the next',
    async (_label, year, month, day) => {
      jest.setSystemTime(new Date(year, month, day, 12));
      const onDayChange = jest.fn();
      await renderHook(() => useLocalDayChange(onDayChange));
      const midnight = new Date(year, month, day + 1);

      await advanceTo(new Date(midnight.getTime() - 1));
      expect(onDayChange).not.toHaveBeenCalled();

      await advanceTo(midnight);
      expect(onDayChange).toHaveBeenCalledTimes(1);

      await advanceTo(new Date(year, month, day + 2));
      expect(onDayChange).toHaveBeenCalledTimes(2);
    },
  );

  it('fires nothing at a background midnight, once on active, and none on a second active', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 23));
    const onDayChange = jest.fn();
    await renderHook(() => useLocalDayChange(onDayChange));

    setAppState('background');
    await advanceTo(new Date(2026, 10, 1));
    expect(onDayChange).not.toHaveBeenCalled();

    await act(async () => emitAppState('active'));
    expect(onDayChange).toHaveBeenCalledTimes(1);

    await act(async () => emitAppState('active'));
    expect(onDayChange).toHaveBeenCalledTimes(1);
  });

  it('fires nothing on a return to active on the same day', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 9));
    const onDayChange = jest.fn();
    await renderHook(() => useLocalDayChange(onDayChange));

    await act(async () => emitAppState('background'));
    await advanceTo(new Date(2026, 9, 31, 10));
    await act(async () => emitAppState('active'));

    expect(onDayChange).not.toHaveBeenCalled();
  });

  it('rebuilds the midnight delay from the wall clock on the return to active', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 20));
    const onDayChange = jest.fn();
    await renderHook(() => useLocalDayChange(onDayChange));

    await act(async () => emitAppState('background'));
    jest.setSystemTime(new Date(2026, 9, 31, 23, 10));
    await act(async () => emitAppState('active'));
    await advanceTo(new Date(2026, 10, 1));

    expect(onDayChange).toHaveBeenCalledTimes(1);
  });

  it('holds no armed timer while blurred across midnight, and fires once at the refocus', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 23));
    const onDayChange = jest.fn();
    const hook = await renderHook(() => useLocalDayChange(onDayChange));
    expect(armedDayTimers()).toBe(1);

    mockFocused = false;
    await hook.rerender({});
    expect(armedDayTimers()).toBe(0);

    await advanceTo(new Date(2026, 10, 1, 8));
    expect(onDayChange).not.toHaveBeenCalled();

    mockFocused = true;
    await hook.rerender({});
    expect(onDayChange).toHaveBeenCalledTimes(1);
  });

  it('leaves no timer and no subscription after unmount', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 12));
    const hook = await renderHook(() => useLocalDayChange(jest.fn()));
    expect(armedDayTimers()).toBe(1);
    expect(changeListeners.size).toBe(1);

    await hook.unmount();

    expect(armedDayTimers()).toBe(0);
    expect(changeListeners.size).toBe(0);
  });
});

describe('shared with useLocalToday (MA-250)', () => {
  it('runs one day timer and one listener for both, and moves both at the midnight', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 12));
    const onDayChange = jest.fn();
    await renderHook(() => useLocalDayChange(onDayChange));
    const sheet = await renderHook(() => useLocalToday('2026-10-31', true));
    expect(armedDayTimers()).toBe(1);
    expect(changeListeners.size).toBe(1);

    await advanceTo(new Date(2026, 10, 1, 0, 0, 1));

    expect(onDayChange).toHaveBeenCalledTimes(1);
    expect(sheet.result.current).toBe('2026-11-01');
  });

  it('moves the sheet while the route is blurred, and fires the route once at the refocus', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 12));
    const onDayChange = jest.fn();
    const route = await renderHook(() => useLocalDayChange(onDayChange));
    const sheet = await renderHook(() => useLocalToday('2026-10-31', true));

    mockFocused = false;
    await route.rerender({});
    await advanceTo(new Date(2026, 10, 1, 0, 0, 1));
    expect(onDayChange).not.toHaveBeenCalled();
    expect(sheet.result.current).toBe('2026-11-01');

    mockFocused = true;
    await route.rerender({});
    expect(onDayChange).toHaveBeenCalledTimes(1);
  });

  it('keeps the day timer and the listener until the last of the two unmounts', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 12));
    const route = await renderHook(() => useLocalDayChange(jest.fn()));
    const sheet = await renderHook(() => useLocalToday('2026-10-31', true));

    await route.unmount();
    expect(armedDayTimers()).toBe(1);
    expect(changeListeners.size).toBe(1);

    await sheet.unmount();
    expect(armedDayTimers()).toBe(0);
    expect(changeListeners.size).toBe(0);
  });

  it('rebuilds the midnight delay from the wall clock when the route mounts beside an open sheet', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 20));
    const sheet = await renderHook(() => useLocalToday('2026-10-31', true));
    jest.setSystemTime(new Date(2026, 9, 31, 23, 10));
    const onDayChange = jest.fn();
    await renderHook(() => useLocalDayChange(onDayChange));

    await advanceTo(new Date(2026, 10, 1, 0, 0, 1));

    expect(onDayChange).toHaveBeenCalledTimes(1);
    expect(sheet.result.current).toBe('2026-11-01');
  });

  it('keeps a due day timer when the route mounts past the midnight it waits for', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 12));
    const sheet = await renderHook(() => useLocalToday('2026-10-31', true));
    jest.setSystemTime(new Date(2026, 10, 1, 0, 0, 1));
    await renderHook(() => useLocalDayChange(jest.fn()));

    await act(async () => {
      jest.advanceTimersByTime(12 * 60 * 60_000);
    });

    expect(sheet.result.current).toBe('2026-11-01');
  });
});
