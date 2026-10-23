import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useToast } from '@/components/ui/toast';
import { Strings } from '@/constants/strings';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import {
  isTransactionFormSessionSaving,
  useTransactionFormState,
} from '@/modules/transactions/store/transaction_form_host.state';
import {
  type FormSessionHostSource,
  subscribeToAll,
  useFormSessionHost,
} from '@/utils/use_form_session.hook';

const TRANSACTION_FORM_SESSION_SOURCE: FormSessionHostSource = {
  read: () => {
    const { phase, sessionId, footer, mode } = useTransactionFormState.getState();
    return { phase, sessionId, footer, sessionSaving: isTransactionFormSessionSaving(mode) };
  },
  subscribe: subscribeToAll([
    useTransactionFormState,
    useAddTransactionState,
    useEditTransactionState,
  ]),
  requestClose: () => useTransactionFormState.getState().requestClose(),
};

export function useTransactionFormHost() {
  const router = useRouter();
  const { toast } = useToast();
  const { mode, phase, sessionId, editingTx, footer, prerequisiteStatus } = useTransactionFormState(
    useShallow((state) => ({
      mode: state.mode,
      phase: state.phase,
      sessionId: state.sessionId,
      editingTx: state.editingTx,
      footer: state.footer,
      prerequisiteStatus: state.prerequisiteStatus,
    })),
  );
  const {
    state: session,
    registerSubmit,
    handleSave,
    handleOpenChange,
    handleClose,
  } = useFormSessionHost(TRANSACTION_FORM_SESSION_SOURCE);
  const completeSave = useTransactionFormState.getState().completeSave;
  const completeClose = useTransactionFormState.getState().completeClose;
  const requestAccountCreation = useTransactionFormState.getState().requestAccountCreation;

  const handleSaved = useCallback(
    (ownerSessionId: number) => {
      const current = useTransactionFormState.getState();
      if (!completeSave(ownerSessionId)) return;
      current.onEditSaved?.();
    },
    [completeSave],
  );

  const handleRequestAccountCreation = useCallback(
    (ownerSessionId: number) => {
      requestAccountCreation(ownerSessionId);
    },
    [requestAccountCreation],
  );

  const handleCloseComplete = useCallback(() => {
    const postCloseAction = completeClose(sessionId);
    if (postCloseAction === 'addAccount') router.push('/accounts/add_account');
    if (postCloseAction === 'saved') {
      toast.show({ label: Strings.transactionSavedToast, variant: 'success' });
    }
  }, [completeClose, router, sessionId, toast]);

  return {
    state: {
      mode,
      phase,
      sessionId,
      editingTx,
      footer,
      showsStatusTrack: prerequisiteStatus === 'ready',
      isOpen: phase === 'open',
      isDismissable: session.isDismissable,
      title: mode === 'edit' ? Strings.editTxTitle : Strings.addTxTitle,
    },
    registerSubmit,
    handleSave,
    handleOpenChange,
    handleClose,
    handleSaved,
    handleRequestAccountCreation,
    handleCloseComplete,
  };
}
