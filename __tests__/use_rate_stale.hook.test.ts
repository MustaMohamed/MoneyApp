import { act, renderHook } from '@testing-library/react-native';

import { useRateStale } from '@/modules/currency/store/use_rate_stale.hook';

const NOW_MS = Date.parse('2026-09-30T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_AGE_MS = 30 * DAY_MS;
const MAX_TIMER_MS = 2 ** 31 - 1;

function updatedAtAged(ageMs: number): string {
  return new Date(NOW_MS - ageMs).toISOString();
}

function advance(ms: number) {
  return act(() => {
    jest.advanceTimersByTime(ms);
  });
}

// A render leaves zero-delay fake jobs in the count, so a tick of 0 runs them before it reads the armed timers.
function armedTimerCount(): number {
  jest.advanceTimersByTime(0);
  return jest.getTimerCount();
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW_MS });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useRateStale (MA-272)', () => {
  it('turns true at the first stale instant with no rerender, then leaves no timer', async () => {
    const updatedAt = updatedAtAged(STALE_AGE_MS - 1000);
    const { result } = await renderHook(() => useRateStale(updatedAt, true));
    expect(result.current).toBe(false);

    await advance(1000);
    expect(result.current).toBe(false);

    await advance(1);
    expect(result.current).toBe(true);
    expect(armedTimerCount()).toBe(0);
  });

  it('re-arms past the single-timer cap, staying false until the boundary 29 days out', async () => {
    const updatedAt = updatedAtAged(DAY_MS);
    const { result } = await renderHook(() => useRateStale(updatedAt, true));
    expect(result.current).toBe(false);

    await advance(MAX_TIMER_MS);
    expect(result.current).toBe(false);
    expect(armedTimerCount()).toBe(1);

    await advance(29 * DAY_MS - MAX_TIMER_MS);
    expect(result.current).toBe(false);

    await advance(1);
    expect(result.current).toBe(true);
  });

  it('arms nothing while inactive, and its turn to active past the boundary reads true', async () => {
    const updatedAt = updatedAtAged(STALE_AGE_MS - 1000);
    const { result, rerender } = await renderHook(
      ({ isActive }: { isActive: boolean }) => useRateStale(updatedAt, isActive),
      { initialProps: { isActive: false } },
    );
    expect(armedTimerCount()).toBe(0);

    await advance(1001);
    expect(result.current).toBe(false);

    await rerender({ isActive: true });

    expect(result.current).toBe(true);
    expect(armedTimerCount()).toBe(0);
  });

  it('reads false for a new rateUpdatedAt after a stale one', async () => {
    const { result, rerender } = await renderHook(
      ({ updatedAt }: { updatedAt: string }) => useRateStale(updatedAt, true),
      { initialProps: { updatedAt: updatedAtAged(STALE_AGE_MS + DAY_MS) } },
    );
    expect(result.current).toBe(true);

    await rerender({ updatedAt: updatedAtAged(DAY_MS) });

    expect(result.current).toBe(false);
  });

  it('arms nothing with no update time', async () => {
    const { result } = await renderHook(() => useRateStale(null, true));

    expect(result.current).toBe(false);
    expect(armedTimerCount()).toBe(0);
  });

  it('leaves no timer after an unmount', async () => {
    const updatedAt = updatedAtAged(DAY_MS);
    const { unmount } = await renderHook(() => useRateStale(updatedAt, true));
    expect(armedTimerCount()).toBe(1);

    await unmount();

    expect(armedTimerCount()).toBe(0);
  });
});
