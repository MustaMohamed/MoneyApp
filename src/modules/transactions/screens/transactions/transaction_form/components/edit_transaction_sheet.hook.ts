import { useEffect } from 'react';

import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';

const CLOSE_UNMOUNT_DELAY_MS = 350;

export function useEditTransactionSheetLifecycle(visible: boolean): void {
  const completeClose = useEditTransactionState.getState().completeClose;
  const resetDraft = useEditTransactionStore.getState().reset;

  useEffect(() => {
    if (visible) return undefined;

    const timer = setTimeout(() => {
      resetDraft();
      completeClose();
    }, CLOSE_UNMOUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [completeClose, resetDraft, visible]);

  useEffect(
    () => () => {
      resetDraft();
      completeClose();
    },
    [completeClose, resetDraft],
  );
}
