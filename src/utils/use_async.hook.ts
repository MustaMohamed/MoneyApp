import { type Signal, useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

type AsyncStatus = {
  isLoading: Signal<boolean>;
  isError: Signal<boolean>;
};

// oxlint-disable-next-line typescript/no-explicit-any -- generic function wrapper must preserve arbitrary callable parameters
type AnyFn = (...args: any[]) => unknown;

type AsyncFn<T extends AnyFn> = ((...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>) &
  AsyncStatus;

export function useAsync<T extends AnyFn>(fn: T): AsyncFn<T> {
  useSignals();
  const isLoading = useSignal(false);
  const isError = useSignal(false);
  const pendingCalls = useSignal(0);

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- TS cannot prove an async wrapper plus attached signal refs matches AsyncFn<T>
  const asyncFn = (async (...args: Parameters<T>) => {
    pendingCalls.value += 1;
    isError.value = false;

    if (pendingCalls.value > 0) {
      isLoading.value = true;
    }

    let result: ReturnType<T>;
    try {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- generic wrapper preserves T's declared return type while normalizing sync/async execution
      result = fn(...args) as ReturnType<T>;
    } catch (e: unknown) {
      isError.value = true;
      pendingCalls.value = Math.max(0, pendingCalls.value - 1);
      isLoading.value = pendingCalls.value > 0;
      throw e;
    }

    return Promise.resolve(result)
      .catch((e: unknown) => {
        isError.value = true;
        throw e;
      })
      .finally(() => {
        pendingCalls.value = Math.max(0, pendingCalls.value - 1);
        isLoading.value = pendingCalls.value > 0;
      });
  }) as AsyncFn<T>;

  asyncFn.isLoading = isLoading;
  asyncFn.isError = isError;

  return asyncFn;
}
