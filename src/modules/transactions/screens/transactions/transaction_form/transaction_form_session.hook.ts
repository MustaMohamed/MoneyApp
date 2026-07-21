import { useLayoutEffect } from 'react';

export function useTransactionFormSessionReady(
  sessionId: number,
  onReady: (sessionId: number) => void,
  ready = true,
): void {
  useLayoutEffect(() => {
    if (!ready) return;
    onReady(sessionId);
  }, [onReady, ready, sessionId]);
}
