import { act, renderHook } from '@testing-library/react-native';
import { useEffect } from 'react';

import { advanceTo, mockAppStateListeners } from '@/test_helpers/clock';
import { useLocalToday } from '@/utils/use_local_today.hook';

type Props = { seed: string | undefined; active: boolean };

const MINUTE_MS = 60_000;
let appState: ReturnType<typeof mockAppStateListeners>;
let changeListeners: ReturnType<typeof mockAppStateListeners>['listeners'];
let setTimeoutSpy: jest.SpyInstance;
let clearTimeoutSpy: jest.SpyInstance;

// React's own short timers share the fake clock, so only a timer set past a minute is the day timer.
function armedDayTimers() {
  const cleared = clearTimeoutSpy.mock.calls.map(([timer]) => timer);
  return setTimeoutSpy.mock.calls.filter(
    ([, delay], index) =>
      (delay ?? 0) > MINUTE_MS && !cleared.includes(setTimeoutSpy.mock.results[index].value),
  ).length;
}

async function mountToday(seed: string | undefined, active = true) {
  return renderHook((props: Props) => useLocalToday(props.seed, props.active), {
    initialProps: { seed, active },
  });
}

// Records the value each committed render returned, from both instances on the one harness.
function useTwoInstances(props: Props, committed: [string | undefined, string | undefined][]) {
  const first = useLocalToday(props.seed, props.active);
  const second = useLocalToday(props.seed, props.active);
  useEffect(() => {
    committed.push([first, second]);
  });
  return [first, second];
}

beforeEach(() => {
  jest.useFakeTimers();
  setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
  clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
  appState = mockAppStateListeners();
  changeListeners = appState.listeners;
});

afterEach(() => {
  setTimeoutSpy.mockRestore();
  clearTimeoutSpy.mockRestore();
  jest.useRealTimers();
});

describe('useLocalToday (MA-250)', () => {
  it('returns the seed with no timer advance', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 12));

    const { result } = await mountToday('2026-10-31');

    expect(result.current).toBe('2026-10-31');
  });

  it.each([
    ['2026-10-31', 2026, 9, 31, '2026-11-01', '2026-11-02'],
    ['2026-12-31', 2026, 11, 31, '2027-01-01', '2027-01-02'],
    ['2028-02-28', 2028, 1, 28, '2028-02-29', '2028-03-01'],
    ['2028-02-29', 2028, 1, 29, '2028-03-01', '2028-03-02'],
  ])(
    'seeded %s at 23:59 local, moves at the midnight with no rerender, and again at the next',
    async (seed, year, month, day, nextDay, dayAfter) => {
      jest.setSystemTime(new Date(year, month, day, 23, 59));
      const { result } = await mountToday(seed);
      expect(result.current).toBe(seed);

      await advanceTo(new Date(year, month, day + 1, 0, 0, 1));
      expect(result.current).toBe(nextDay);

      await advanceTo(new Date(year, month, day + 2, 0, 0, 1));
      expect(result.current).toBe(dayAfter);
    },
  );

  it('two instances on one harness commit the same value on every render across the midnight', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 23, 59));
    const committed: [string | undefined, string | undefined][] = [];
    await renderHook((props: Props) => useTwoInstances(props, committed), {
      initialProps: { seed: '2026-10-31', active: true },
    });

    await advanceTo(new Date(2026, 10, 1, 0, 0, 1));

    expect(committed.length).toBeGreaterThan(1);
    for (const [first, second] of committed) expect(first).toBe(second);
    expect(committed.at(-1)).toEqual(['2026-11-01', '2026-11-01']);
  });

  it('holds the seed across a midnight passed in the background, and moves on the return to active', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 23));
    const { result } = await mountToday('2026-10-31');

    appState.setState('background');
    await advanceTo(new Date(2026, 10, 1, 0, 0, 1));
    expect(result.current).toBe('2026-10-31');

    await act(async () => appState.emit('active'));
    expect(result.current).toBe('2026-11-01');
  });

  it('inactive, arms no day timer and no listener, and returns the seed across the midnight', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 12));
    const { result } = await mountToday('2026-10-31', false);

    expect(armedDayTimers()).toBe(0);
    expect(changeListeners.size).toBe(0);

    await advanceTo(new Date(2026, 10, 1, 1));
    expect(result.current).toBe('2026-10-31');
  });

  it('follows the local date back a day on the return to active after the clock moved back', async () => {
    jest.setSystemTime(new Date(2026, 10, 1, 9));
    const { result } = await mountToday('2026-11-01');

    await act(async () => appState.emit('background'));
    jest.setSystemTime(new Date(2026, 9, 31, 9));
    await act(async () => appState.emit('active'));

    expect(result.current).toBe('2026-10-31');
  });

  it('inactive across the midnight, then active with the later seed, commits that seed on its first render', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 23, 59));
    const committed: [string | undefined, string | undefined][] = [];
    const hook = await renderHook((props: Props) => useTwoInstances(props, committed), {
      initialProps: { seed: '2026-10-31', active: false },
    });

    await advanceTo(new Date(2026, 10, 1, 0, 0, 30));
    expect(hook.result.current).toEqual(['2026-10-31', '2026-10-31']);
    const before = committed.length;

    await hook.rerender({ seed: '2026-11-01', active: true });

    expect(committed.slice(before)).not.toHaveLength(0);
    for (const values of committed.slice(before)) {
      expect(values).toEqual(['2026-11-01', '2026-11-01']);
    }
  });

  it('reads a midnight passed between the render and the effect, with no timer advance', async () => {
    jest.setSystemTime(new Date(2026, 10, 1, 0, 0, 1));

    const { result } = await mountToday('2026-10-31');

    expect(result.current).toBe('2026-11-01');
  });

  it('keeps the moved day once inactive with the same seed', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 23, 59));
    const hook = await mountToday('2026-10-31');
    await advanceTo(new Date(2026, 10, 1, 0, 0, 1));
    expect(hook.result.current).toBe('2026-11-01');

    await hook.rerender({ seed: '2026-10-31', active: false });

    expect(hook.result.current).toBe('2026-11-01');
  });

  it('returns undefined for an undefined seed', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 12));

    const { result } = await mountToday(undefined);

    expect(result.current).toBeUndefined();
  });

  it('shares one day timer and one listener, and the last unmount clears both', async () => {
    jest.setSystemTime(new Date(2026, 9, 31, 12));
    const first = await mountToday('2026-10-31');
    const second = await mountToday('2026-10-31');
    expect(armedDayTimers()).toBe(1);
    expect(changeListeners.size).toBe(1);

    await first.unmount();
    expect(armedDayTimers()).toBe(1);
    expect(changeListeners.size).toBe(1);

    await second.unmount();
    expect(armedDayTimers()).toBe(0);
    expect(changeListeners.size).toBe(0);
  });
});
