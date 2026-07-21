import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';

import {
  isTransactionFormSessionSaving,
  useTransactionFormV2State,
} from './transaction_form_v2.state';

export type TransactionFormV2Submit = () => Promise<void>;
export type RegisterTransactionFormV2Submit = (
  sessionId: number,
  submit: TransactionFormV2Submit | undefined,
) => void;

interface RegisteredSubmit {
  sessionId: number;
  submit: TransactionFormV2Submit;
}

export function useTransactionFormV2Host() {
  const router = useRouter();
  const { mode, phase, sessionId, editingTx, footer } = useTransactionFormV2State(
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
  const requestClose = useTransactionFormV2State.getState().requestClose;
  const completeSave = useTransactionFormV2State.getState().completeSave;
  const completeClose = useTransactionFormV2State.getState().completeClose;
  const requestAccountCreation = useTransactionFormV2State.getState().requestAccountCreation;

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

  const registerSubmit = useCallback<RegisterTransactionFormV2Submit>((ownerSessionId, submit) => {
    if (ownerSessionId !== useTransactionFormV2State.getState().sessionId) return;
    submitRef.current = submit ? { sessionId: ownerSessionId, submit } : undefined;
  }, []);

  const handleSave = useCallback(() => {
    const current = useTransactionFormV2State.getState();
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
      const current = useTransactionFormV2State.getState();
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
