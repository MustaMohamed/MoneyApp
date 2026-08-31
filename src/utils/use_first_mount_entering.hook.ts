import { useRef } from 'react';

const seen = new Set<string>();

/** True on a key's first mount per session; gates `entering` so it does not replay on remount. */
export function useFirstMountEntering(key: string, claim: boolean = true): boolean {
  const ref = useRef<boolean | null>(null);
  if (ref.current === null && claim) {
    ref.current = !seen.has(key);
    seen.add(key);
  }
  return ref.current ?? false;
}
