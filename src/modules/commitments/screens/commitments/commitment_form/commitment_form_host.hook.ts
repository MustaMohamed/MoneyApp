import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';

import { useAddCommitmentState } from './add_commitment.state';
import { useEditCommitmentState } from './edit_commitment.state';

export type CommitmentFormSubmit = () => Promise<void>;
export type RegisterCommitmentFormSubmit = (
  sessionId: number,
  submit: CommitmentFormSubmit | undefined,
) => void;

interface RegisteredSubmit {
  sessionId: number;
  submit: CommitmentFormSubmit;
}

export function useCommitmentFormHost() {
  const { phase, sessionId, mode, editingCommitmentId, footer } = useCommitmentFormHostState(
    useShallow((state) => ({
      phase: state.phase,
      sessionId: state.sessionId,
      mode: state.mode,
      editingCommitmentId: state.editingCommitmentId,
      footer: state.footer,
    })),
  );
  const addSaving = useAddCommitmentState((state) => state.saving);
  const editSaving = useEditCommitmentState((state) =>
    Object.values(state.entries).some((entry) => entry.saving),
  );
  const sessionSaving = mode === 'add' ? addSaving : mode === 'edit' ? editSaving : false;
  const requestClose = useCommitmentFormHostState.getState().requestClose;
  const completeSave = useCommitmentFormHostState.getState().completeSave;
  const completeClose = useCommitmentFormHostState.getState().completeClose;
  const submitRef = useRef<RegisteredSubmit | undefined>(undefined);
  const hasSession = phase !== 'closed';

  useEffect(() => {
    if (phase === 'closed') submitRef.current = undefined;
  }, [phase]);

  useEffect(() => {
    if (!hasSession) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => subscription.remove();
  }, [hasSession, requestClose]);

  const registerSubmit = useCallback<RegisterCommitmentFormSubmit>((ownerSessionId, submit) => {
    if (ownerSessionId !== useCommitmentFormHostState.getState().sessionId) return;
    submitRef.current = submit ? { sessionId: ownerSessionId, submit } : undefined;
  }, []);

  const handleSave = useCallback(() => {
    const current = useCommitmentFormHostState.getState();
    const registered = submitRef.current;
    // The footer still takes taps while the sheet animates closed; a Save there would write a dismissed draft.
    if (current.phase !== 'open' || current.footer.saving) return;
    if (!registered || registered.sessionId !== current.sessionId) return;
    void registered.submit();
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
      const { landing } = useCommitmentFormHostState.getState();
      if (!completeSave(ownerSessionId)) return;
      landing?.onSaved?.();
    },
    [completeSave],
  );

  const handleDeactivated = useCallback(
    (ownerSessionId: number) => {
      const { landing } = useCommitmentFormHostState.getState();
      if (!completeSave(ownerSessionId)) return;
      landing?.onDeactivated?.();
    },
    [completeSave],
  );

  const handleCloseComplete = useCallback(() => {
    completeClose(sessionId);
  }, [completeClose, sessionId]);

  return {
    state: {
      isOpen: phase === 'open',
      hasSession,
      sessionId,
      mode,
      editingCommitmentId,
      title: mode === 'edit' ? Strings.commitmentsEditTitle : Strings.commitmentsAddTitle,
      isDismissable: !footer.saving && !sessionSaving,
      saving: footer.saving,
      saveError: footer.errorMessage,
    },
    registerSubmit,
    handleSave,
    handleOpenChange,
    handleClose,
    handleSaved,
    handleDeactivated,
    handleCloseComplete,
  };
}
