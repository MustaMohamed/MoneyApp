/**
 * Module-level singleton tracking the currently-open SwipeableRow.
 *
 * Design: plain pub/sub with no React dependency. Components subscribe on
 * mount and unsubscribe on unmount. Opening a row notifies all subscribers
 * with the new id; closing notifies with null. Components compare the
 * notified id with their own rowId to decide whether to close.
 *
 * The registry is called synchronously from gesture callbacks and Reanimated
 * worklets, so a plain module variable keeps row coordination instantaneous.
 */

type Subscriber = (activeId: string | null) => void;

let activeRowId: string | null = null;
const subscribers = new Set<Subscriber>();

function notify(id: string | null): void {
  subscribers.forEach((cb) => cb(id));
}

/** Mark row `id` as open. Notifies all subscribers. */
export function openRow(id: string): void {
  activeRowId = id;
  notify(id);
}

/**
 * Mark row `id` as closed. No-op if `id` is not the currently-open row
 * (prevents a row from closing another row that opened after it).
 */
export function closeRow(id: string): void {
  if (activeRowId !== id) return;
  activeRowId = null;
  notify(null);
}

/** Close whichever row is open, if any. Used on scroll / screen blur. */
export function closeAllRows(): void {
  if (activeRowId === null) return;
  activeRowId = null;
  notify(null);
}

/**
 * Subscribe to registry changes. Callback receives the new active row id
 * (or null when closed). Returns an unsubscribe function.
 */
export function subscribeToRegistry(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/** Read the current active row id (for non-reactive imperative checks). */
export function getActiveRowId(): string | null {
  return activeRowId;
}
