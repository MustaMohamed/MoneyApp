import { useCallback, useRef, useState } from 'react';

type AsyncStatus = {
  isLoading: boolean;
  isError: boolean;
};

// oxlint-disable-next-line typescript/no-explicit-any -- generic function wrapper must preserve arbitrary callable parameters
type AnyFn = (...args: any[]) => unknown;

type AsyncFn<T extends AnyFn> = ((...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>) &
  AsyncStatus;

export function useAsync<T extends AnyFn>(fn: T): AsyncFn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const pendingCalls = useRef(0);

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- callback gains status booleans.
  const asyncFn = useCallback(
    async (...args: Parameters<T>) => {
      pendingCalls.current += 1;
      setIsError(false);
      setIsLoading(true);

      let result: ReturnType<T>;
      try {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- preserves T while normalizing sync/async.
        result = fn(...args) as ReturnType<T>;
      } catch (e: unknown) {
        setIsError(true);
        pendingCalls.current = Math.max(0, pendingCalls.current - 1);
        setIsLoading(pendingCalls.current > 0);
        throw e;
      }

      return Promise.resolve(result)
        .catch((e: unknown) => {
          setIsError(true);
          throw e;
        })
        .finally(() => {
          pendingCalls.current = Math.max(0, pendingCalls.current - 1);
          setIsLoading(pendingCalls.current > 0);
        });
    },
    [fn],
  ) as AsyncFn<T>;

  asyncFn.isLoading = isLoading;
  asyncFn.isError = isError;

  return asyncFn;
}
