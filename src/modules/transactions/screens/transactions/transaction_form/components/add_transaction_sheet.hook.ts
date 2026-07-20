import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';

import { useAddTransactionSheetState } from './add_transaction_sheet.state';

const CLOSE_UNMOUNT_DELAY_MS = 350;

export function useAddTransactionSheetLifecycle(visible: boolean) {
  const state = useAddTransactionSheetState(
    useShallow((sheet) => ({
      readyToOpen: sheet.readyToOpen,
      shouldRenderInner: sheet.shouldRenderInner,
      hasFooter: sheet.hasFooter,
      saving: sheet.saving,
      saveDisabled: sheet.saveDisabled,
      saveAction: sheet.saveAction,
    })),
  );
  const prepareOpen = useAddTransactionSheetState.getState().prepareOpen;
  const show = useAddTransactionSheetState.getState().show;
  const startClose = useAddTransactionSheetState.getState().startClose;
  const finishClose = useAddTransactionSheetState.getState().finishClose;
  const completeClose = useAddTransactionState.getState().completeClose;
  const resetDraft = useAddTransactionStore.getState().reset;

  useEffect(() => {
    if (!visible) {
      startClose();
      const timer = setTimeout(() => {
        finishClose();
        resetDraft();
        completeClose();
      }, CLOSE_UNMOUNT_DELAY_MS);
      return () => clearTimeout(timer);
    }

    prepareOpen();
    const timer = setTimeout(show, 0);
    return () => clearTimeout(timer);
  }, [completeClose, finishClose, prepareOpen, resetDraft, show, startClose, visible]);

  useEffect(
    () => () => {
      finishClose();
      resetDraft();
      completeClose();
    },
    [completeClose, finishClose, resetDraft],
  );

  return state;
}
