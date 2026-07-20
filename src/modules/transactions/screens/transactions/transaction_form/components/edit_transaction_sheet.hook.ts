import { useCallback, useEffect, useRef } from 'react';

import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';

export function useEditTransactionSheetLifecycle(visible: boolean) {
  const sessionId = useEditTransactionState.useState.sessionId();
  const completeClose = useEditTransactionState.getState().completeClose;
  const resetDraft = useEditTransactionStore.getState().reset;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const handleCloseComplete = useCallback(() => {
    if (visibleRef.current) return;
    resetDraft();
    completeClose();
  }, [completeClose, resetDraft]);

  useEffect(
    () => () => {
      resetDraft();
      completeClose();
    },
    [completeClose, resetDraft],
  );

  return { sessionId, handleCloseComplete };
}
