import { useCallback, useState } from 'react';

/**
 * useConfirmAction — shared confirm/cancel gate for destructive swipe actions.
 *
 * Owns three pieces of state:
 *   pendingPayload — the item id (or any typed payload) waiting for confirmation.
 *                    null means no action is pending (sheet should be closed).
 *   busy           — true while the async action is in flight; gates the sheet
 *                    from being dismissed and prevents double-invocation.
 *
 * Usage:
 *   const { pendingPayload, busy, request, confirm, cancel } =
 *     useConfirmAction<string>((id) => deleteTransaction(id));
 *
 *   // User taps Delete tile:
 *   onDelete={() => request(tx.id)}
 *
 *   // ConfirmSheet:
 *   <ConfirmSheet
 *     isOpen={pendingPayload !== null}
 *     busy={busy}
 *     onConfirm={confirm}
 *     onCancel={cancel}
 *   />
 *
 * @param action - async function that receives the pending payload and performs
 *                 the mutation. Called exactly once per confirm(); never called
 *                 on cancel() or when pendingPayload is null.
 */
export function useConfirmAction<T>(action: (payload: T) => Promise<void>) {
  const [pendingPayload, setPendingPayload] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);

  const request = useCallback((payload: T) => {
    setPendingPayload(payload);
  }, []);

  const cancel = useCallback(() => {
    setPendingPayload(null);
  }, []);

  const confirm = useCallback(async () => {
    // Guard: no pending payload — nothing to confirm
    if (pendingPayload === null) return;
    // Guard: already in flight — prevent double-invoke
    if (busy) return;

    setBusy(true);
    try {
      await action(pendingPayload);
    } finally {
      // Always clear state, even on rejection — sheet must not stay stuck
      setBusy(false);
      setPendingPayload(null);
    }
  }, [action, pendingPayload, busy]);

  return { pendingPayload, busy, request, confirm, cancel };
}
