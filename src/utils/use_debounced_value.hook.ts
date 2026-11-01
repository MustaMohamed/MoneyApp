import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

/** An emptied query applies at once, so a seeded landing never reads the search it cleared. */
export function useDebouncedSearch(query: string, delayMs: number): string {
  const settled = useDebouncedValue(query, query.length === 0 ? 0 : delayMs);
  return query.length === 0 ? '' : settled;
}
