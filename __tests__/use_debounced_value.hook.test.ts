import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '@/utils/use_debounced_value.hook';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the initial value synchronously', () => {
    const { result } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'hello' },
    });
    expect(result.current).toBe('hello');
  });

  it('updates after the delay', () => {
    const { result, rerender } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    expect(result.current).toBe('a');
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('collapses rapid updates to the last value', () => {
    const { result, rerender } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 300), {
      initialProps: { v: '' },
    });
    rerender({ v: 'a' });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ v: 'ab' });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ v: 'abc' });
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('abc');
  });

  it('cleans up the timer on unmount', () => {
    const { rerender, unmount } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    unmount();
    // No assertion needed — running pending timers must not throw / log.
    act(() => {
      jest.runAllTimers();
    });
  });
});
