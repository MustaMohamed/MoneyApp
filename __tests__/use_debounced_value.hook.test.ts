import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedSearch, useDebouncedValue } from '@/utils/use_debounced_value.hook';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the initial value before the debounce elapses', async () => {
    const { result } = await renderHook(({ v }: { v: string }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'hello' },
    });
    expect(result.current).toBe('hello');
  });

  it('updates after the delay', async () => {
    const { result, rerender } = await renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 300),
      {
        initialProps: { v: 'a' },
      },
    );
    await rerender({ v: 'b' });
    expect(result.current).toBe('a');
    await act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('collapses rapid updates to the last value', async () => {
    const { result, rerender } = await renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 300),
      {
        initialProps: { v: '' },
      },
    );
    await rerender({ v: 'a' });
    await act(() => {
      jest.advanceTimersByTime(100);
    });
    await rerender({ v: 'ab' });
    await act(() => {
      jest.advanceTimersByTime(100);
    });
    await rerender({ v: 'abc' });
    await act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('');
    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('abc');
  });

  it('cleans up the timer on unmount', async () => {
    const { rerender, unmount } = await renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 300),
      {
        initialProps: { v: 'a' },
      },
    );
    await rerender({ v: 'b' });
    await unmount();
    // No assertion: the pending timer must not throw when it fires after unmount.
    await act(() => {
      jest.runAllTimers();
    });
  });
});

describe('useDebouncedSearch', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function mountSettled(q: string) {
    return renderHook(({ q: query }: { q: string }) => useDebouncedSearch(query, 300), {
      initialProps: { q },
    });
  }

  it('applies an emptied query in the same render', async () => {
    const { result, rerender } = await mountSettled('zzz');

    await rerender({ q: '' });

    expect(result.current).toBe('');
  });

  it('holds a typed query for its delay', async () => {
    const { result, rerender } = await mountSettled('');

    await rerender({ q: 'a' });
    await act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('');
    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('a');
  });

  it('a retype inside the delay after a clear never brings the cleared query back', async () => {
    const { result, rerender } = await mountSettled('zzz');

    await rerender({ q: '' });
    await act(() => {
      jest.advanceTimersByTime(1);
    });
    await rerender({ q: 'a' });

    expect(result.current).toBe('');
    await act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('');
    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('a');
  });
});
