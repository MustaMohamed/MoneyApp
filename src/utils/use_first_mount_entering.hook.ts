import { useRef } from 'react';

const seen = new Set<string>();

/**
 * Returns true the first time a screen mounts in a given session, false on
 * every subsequent mount. Use to gate `entering={...}` Reanimated animations
 * so they only play on cold-start entry, not when the screen re-mounts via
 * `router.replace()` during a back navigation.
 *
 * Pass a stable key per screen (e.g. `'welcome'`).
 *
 * `claim` (default `true`) gates whether this render is allowed to decide the
 * key's first-mount value at all. A `claim=false` render latches nothing —
 * `key` is not marked seen — and returns the already-latched value if one
 * exists, else `false`. This lets a screen with a discarding render path
 * (e.g. an empty state that unmounts and remounts populated) defer the claim
 * until a render that should count. A mid-mount `claim` flip never changes an
 * already-latched value; only the first render that had `claim=true` decides.
 */
export function useFirstMountEntering(key: string, claim: boolean = true): boolean {
  const ref = useRef<boolean | null>(null);
  if (ref.current === null && claim) {
    ref.current = !seen.has(key);
    seen.add(key);
  }
  return ref.current ?? false;
}
