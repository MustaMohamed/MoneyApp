import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';

import { useAddCommitment } from '../add_commitment/add_commitment.hook';

export function useCommitmentFormHost() {
  const { phase, sessionId } = useCommitmentFormHostState(
    useShallow((state) => ({ phase: state.phase, sessionId: state.sessionId })),
  );
  const requestClose = useCommitmentFormHostState.getState().requestClose;
  const completeSave = useCommitmentFormHostState.getState().completeSave;
  const completeClose = useCommitmentFormHostState.getState().completeClose;
  const draftSessionRef = useRef(0);
  const hasSession = phase !== 'closed';

  const handleSaved = useCallback(() => {
    completeSave();
  }, [completeSave]);
  const { state, form, onSubmit, resetDraft } = useAddCommitment({ onSaved: handleSaved });

  useEffect(() => {
    if (phase !== 'open' || draftSessionRef.current === sessionId) return;
    draftSessionRef.current = sessionId;
    resetDraft();
  }, [phase, sessionId, resetDraft]);

  useEffect(() => {
    if (!hasSession) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => subscription.remove();
  }, [hasSession, requestClose]);

  const handleSave = () => {
    // The footer still takes taps while the sheet animates closed; a Save there would write a dismissed draft.
    if (useCommitmentFormHostState.getState().phase !== 'open') return;
    void onSubmit();
  };

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) requestClose();
    },
    [requestClose],
  );

  const handleCloseComplete = useCallback(() => {
    completeClose(sessionId);
    resetDraft();
  }, [completeClose, resetDraft, sessionId]);

  return {
    state: {
      isOpen: phase === 'open',
      hasSession,
      sessionId,
      title: Strings.commitmentsAddTitle,
      isDismissable: !state.saving,
      saving: state.saving,
      saveError: state.saveError,
      categories: state.categories,
      accounts: state.accounts,
    },
    form,
    handleSave,
    handleOpenChange,
    handleCloseComplete,
  };
}
