// Called synchronously from gesture callbacks and worklets, so keep it a plain module variable.

type Subscriber = (activeId: string | null) => void;

let activeRowId: string | null = null;
const subscribers = new Set<Subscriber>();

function notify(id: string | null): void {
  subscribers.forEach((cb) => cb(id));
}

export function openRow(id: string): void {
  activeRowId = id;
  notify(id);
}

/** No-op unless `id` is the open row, so a stale row cannot close its successor. */
export function closeRow(id: string): void {
  if (activeRowId !== id) return;
  activeRowId = null;
  notify(null);
}

export function closeAllRows(): void {
  if (activeRowId === null) return;
  activeRowId = null;
  notify(null);
}

export function subscribeToRegistry(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/** Non-reactive read for imperative checks. */
export function getActiveRowId(): string | null {
  return activeRowId;
}
