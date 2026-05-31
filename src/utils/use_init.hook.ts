import { untracked, useSignalEffect } from '@preact/signals-react';

export function useInit(fn: () => unknown) {
  useSignalEffect(() => {
    const result = untracked(fn);

    if (result instanceof Promise) {
      result.catch((e: unknown) => {
        console.error(e);
      });
    }
  });
}
