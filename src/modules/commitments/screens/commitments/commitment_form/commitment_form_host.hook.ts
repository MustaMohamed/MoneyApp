import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import {
  COMMITMENT_FORM_SESSION_SOURCE,
  useCommitmentFormHostState,
} from '@/modules/commitments/store/commitment_form_host.state';
import { useFormSessionHost } from '@/utils/use_form_session.hook';

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
  const {
    state: session,
    registerSubmit,
    handleSave,
    handleOpenChange,
    handleClose,
  } = useFormSessionHost(COMMITMENT_FORM_SESSION_SOURCE);
  const completeSave = useCommitmentFormHostState.getState().completeSave;
  const completeClose = useCommitmentFormHostState.getState().completeClose;
  const hasSession = phase !== 'closed';

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
      isDismissable: session.isDismissable,
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
