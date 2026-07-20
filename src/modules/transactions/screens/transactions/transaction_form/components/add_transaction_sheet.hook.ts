import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';

import { useAddTransactionSheetState } from './add_transaction_sheet.state';

export function useAddTransactionSheetLifecycle(visible: boolean) {
  const sessionId = useAddTransactionState.useState.sessionId();
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
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (!visible) {
      startClose();
      return undefined;
    }

    resetDraft();
    prepareOpen();
    const timer = setTimeout(show, 0);
    return () => clearTimeout(timer);
  }, [prepareOpen, resetDraft, show, startClose, visible]);

  const handleCloseComplete = useCallback(() => {
    if (visibleRef.current) return;
    finishClose();
    resetDraft();
    completeClose();
  }, [completeClose, finishClose, resetDraft]);

  useEffect(
    () => () => {
      finishClose();
      resetDraft();
      completeClose();
    },
    [completeClose, finishClose, resetDraft],
  );

  return { ...state, sessionId, handleCloseComplete };
}
