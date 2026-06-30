import { act, renderHook } from '@testing-library/react-native';

import { useAsync } from '@/utils/use_async.hook';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAsync', () => {
  it('sets loading while the wrapped promise is pending and returns the resolved value', async () => {
    const pending = deferred<number>();
    const fn = jest.fn((amount: number) => pending.promise.then((value) => value + amount));
    const { result } = renderHook(() => useAsync(fn));

    let call!: Promise<number>;
    act(() => {
      call = result.current(2);
    });

    expect(fn).toHaveBeenCalledWith(2);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);

    await act(async () => {
      pending.resolve(40);
      await expect(call).resolves.toBe(42);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('sets error after async rejection and rethrows the original error', async () => {
    const error = new Error('load failed');
    const fn = jest.fn(async () => {
      throw error;
    });
    const { result } = renderHook(() => useAsync(fn));

    await act(async () => {
      await expect(result.current()).rejects.toBe(error);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
  });

  it('handles synchronous throws as async rejections', async () => {
    const error = new Error('sync failed');
    const fn = jest.fn(() => {
      throw error;
    });
    const { result } = renderHook(() => useAsync(fn));

    await act(async () => {
      await expect(result.current()).rejects.toBe(error);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
  });

  it('wraps synchronous return values in a promise', async () => {
    const fn = jest.fn((amount: number) => amount + 1);
    const { result } = renderHook(() => useAsync(fn));

    let call!: Promise<number>;
    act(() => {
      call = result.current(41);
    });

    await act(async () => {
      await expect(call).resolves.toBe(42);
    });
  });

  it('keeps loading true until all concurrent calls settle', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const fn = jest
      .fn<Promise<string>, []>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useAsync(fn));

    let firstCall!: Promise<string>;
    let secondCall!: Promise<string>;
    act(() => {
      firstCall = result.current();
      secondCall = result.current();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      first.resolve('first');
      await expect(firstCall).resolves.toBe('first');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      second.resolve('second');
      await expect(secondCall).resolves.toBe('second');
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('resets error before the next call', async () => {
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useAsync(fn));

    await act(async () => {
      await expect(result.current()).rejects.toThrow('first failed');
    });
    expect(result.current.isError).toBe(true);

    await act(async () => {
      await expect(result.current()).resolves.toBe('ok');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
