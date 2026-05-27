import { type Signal, useSignal } from '@preact/signals-react';

type AsyncStatus = {
  isLoading: Signal<boolean>;
  isError: Signal<boolean>;
};

// oxlint-disable-next-line typescript/no-explicit-any -- generic function wrapper must preserve arbitrary callable parameters
type AnyFn = (...args: any[]) => unknown;

export function useAsync<T extends AnyFn>(fn: T): T & AsyncStatus {
  const isLoading = useSignal(false);
  const isError = useSignal(false);

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- TS cannot prove an async wrapper plus attached signal refs preserves T's callable surface
  const asyncFn = (async (...args: Parameters<T>) => {
    isLoading.value = true;
    isError.value = false;

    let result: ReturnType<T>;
    try {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- generic wrapper preserves T's declared return type while normalizing sync/async execution
      result = fn(...args) as ReturnType<T>;
    } catch (e: unknown) {
      isError.value = true;
      isLoading.value = false;
      throw e;
    }

    return Promise.resolve(result)
      .catch((e: unknown) => {
        isError.value = true;
        throw e;
      })
      .finally(() => {
        isLoading.value = false;
      });
  }) as T & AsyncStatus;

  asyncFn.isLoading = isLoading;
  asyncFn.isError = isError;

  return asyncFn;
}
