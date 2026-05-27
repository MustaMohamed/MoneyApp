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
    expect(result.current.isLoading.value).toBe(true);
    expect(result.current.isError.value).toBe(false);

    await act(async () => {
      pending.resolve(40);
      await expect(call).resolves.toBe(42);
    });

    expect(result.current.isLoading.value).toBe(false);
    expect(result.current.isError.value).toBe(false);
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

    expect(result.current.isLoading.value).toBe(false);
    expect(result.current.isError.value).toBe(true);
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

    expect(result.current.isLoading.value).toBe(false);
    expect(result.current.isError.value).toBe(true);
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
    expect(result.current.isError.value).toBe(true);

    await act(async () => {
      await expect(result.current()).resolves.toBe('ok');
    });

    expect(result.current.isLoading.value).toBe(false);
    expect(result.current.isError.value).toBe(false);
  });
});
