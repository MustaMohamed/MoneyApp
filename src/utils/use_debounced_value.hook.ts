import { useEffect, useState } from 'react';

/**
 * Returns `value` immediately on first render. On subsequent value changes,
 * waits `delayMs` of stillness before emitting the new value. Pending timers
 * are cancelled on value change or unmount.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
