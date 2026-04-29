import { useRef } from 'react';

const seen = new Set<string>();

/**
 * Returns true the first time a screen mounts in a given session, false on
 * every subsequent mount. Use to gate `entering={...}` Reanimated animations
 * so they only play on cold-start entry, not when the screen re-mounts via
 * `router.replace()` during a back navigation.
 *
 * Pass a stable key per screen (e.g. `'welcome'`).
 */
export function useFirstMountEntering(key: string): boolean {
  const ref = useRef<boolean | null>(null);
  if (ref.current === null) {
    ref.current = !seen.has(key);
    seen.add(key);
  }
  return ref.current;
}
