import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

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

  useEffect(() => {
    if (!visible) {
      startClose();
      const timer = setTimeout(finishClose, CLOSE_UNMOUNT_DELAY_MS);
      return () => clearTimeout(timer);
    }

    prepareOpen();
    const timer = setTimeout(show, 0);
    return () => clearTimeout(timer);
  }, [finishClose, prepareOpen, show, startClose, visible]);

  return state;
}
