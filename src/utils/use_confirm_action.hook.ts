import { useCallback, useState } from 'react';

/** A rejected action leaves the payload pending, so the confirm UI can explain and retry. */
export function useConfirmAction<T>(action: (payload: T) => Promise<void>) {
  const [pendingPayload, setPendingPayload] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const request = useCallback((payload: T) => {
    setError(null);
    setPendingPayload(payload);
  }, []);

  const cancel = useCallback(() => {
    setError(null);
    setPendingPayload(null);
  }, []);

  const confirm = useCallback(async () => {
    if (pendingPayload === null) return;
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      await action(pendingPayload);
      setPendingPayload(null);
    } catch (actionError) {
      setError(actionError);
    } finally {
      setBusy(false);
    }
  }, [action, pendingPayload, busy]);

  return { pendingPayload, busy, error, request, confirm, cancel };
}
