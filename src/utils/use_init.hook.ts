import { useEffect, useRef } from 'react';

export function useInit(fn: () => unknown) {
  const hasRun = useRef(false);
  const initRef = useRef(fn);
  initRef.current = fn;

  useEffect(() => {
    if (hasRun.current) return;

    hasRun.current = true;
    const result = initRef.current();

    if (result instanceof Promise) {
      result.catch((e: unknown) => {
        console.error(e);
      });
    }
  }, []);
}
