import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';

import {
  isTransactionFormSessionSaving,
  useTransactionFormState,
} from './transaction_form_host.state';

export type TransactionFormSubmit = () => Promise<void>;
export type RegisterTransactionFormSubmit = (
  sessionId: number,
  submit: TransactionFormSubmit | undefined,
) => void;

interface RegisteredSubmit {
  sessionId: number;
  submit: TransactionFormSubmit;
}

export function useTransactionFormHost() {
  const router = useRouter();
  const { mode, phase, sessionId, editingTx, footer } = useTransactionFormState(
    useShallow((state) => ({
      mode: state.mode,
      phase: state.phase,
      sessionId: state.sessionId,
      editingTx: state.editingTx,
      footer: state.footer,
    })),
  );
  const submitRef = useRef<RegisteredSubmit | undefined>(undefined);
  const submitInFlightRef = useRef<number | undefined>(undefined);
  const addSaving = useAddTransactionState((state) => state.saving);
  const editSaving = useEditTransactionState((state) => state.saving);
  const activeFormSaving = mode === 'add' ? addSaving : mode === 'edit' ? editSaving : false;
  const requestClose = useTransactionFormState.getState().requestClose;
  const completeSave = useTransactionFormState.getState().completeSave;
  const completeClose = useTransactionFormState.getState().completeClose;
  const requestAccountCreation = useTransactionFormState.getState().requestAccountCreation;

  useEffect(() => {
    if (phase === 'closed') {
      submitRef.current = undefined;
      submitInFlightRef.current = undefined;
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'closed') return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => subscription.remove();
  }, [phase, requestClose]);

  const registerSubmit = useCallback<RegisterTransactionFormSubmit>((ownerSessionId, submit) => {
    if (ownerSessionId !== useTransactionFormState.getState().sessionId) return;
    submitRef.current = submit ? { sessionId: ownerSessionId, submit } : undefined;
  }, []);

  const handleSave = useCallback(() => {
    const current = useTransactionFormState.getState();
    const registered = submitRef.current;
    if (
      current.phase !== 'open' ||
      current.footer.disabled ||
      current.footer.saving ||
      isTransactionFormSessionSaving(current.mode) ||
      submitInFlightRef.current === current.sessionId ||
      !registered ||
      registered.sessionId !== current.sessionId
    ) {
      return;
    }
    submitInFlightRef.current = current.sessionId;
    let submitResult: Promise<void>;
    try {
      submitResult = registered.submit();
    } catch {
      submitInFlightRef.current = undefined;
      return;
    }
    void submitResult.then(
      () => {
        if (submitInFlightRef.current === current.sessionId) {
          submitInFlightRef.current = undefined;
        }
      },
      () => {
        if (submitInFlightRef.current === current.sessionId) {
          submitInFlightRef.current = undefined;
        }
      },
    );
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) requestClose();
    },
    [requestClose],
  );

  const handleClose = useCallback(() => {
    requestClose();
  }, [requestClose]);

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
  }, [completeClose, router, sessionId]);

  return {
    state: {
      mode,
      phase,
      sessionId,
      editingTx,
      footer,
      isOpen: phase === 'open',
      isDismissable: !footer.saving && !activeFormSaving,
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
