import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useToast } from '@/components/ui/toast';
import { Strings } from '@/constants/strings';
import {
  COMMITMENT_FORM_SESSION_SOURCE,
  type CommitmentFormPostCloseToast,
  useCommitmentFormHostState,
} from '@/modules/commitments/store/commitment_form_host.state';
import { useFormSessionHost } from '@/utils/use_form_session.hook';

const POST_CLOSE_TOAST_LABEL: Record<CommitmentFormPostCloseToast, string> = {
  added: Strings.commitmentsAddedToast,
  updated: Strings.commitmentsUpdatedToast,
};

export function useCommitmentFormHost() {
  const { toast } = useToast();
  const { phase, sessionId, mode, editingCommitment, footer } = useCommitmentFormHostState(
    useShallow((state) => ({
      phase: state.phase,
      sessionId: state.sessionId,
      mode: state.mode,
      editingCommitment: state.editingCommitment,
      footer: state.footer,
    })),
  );
  const {
    state: session,
    registerSubmit,
    handleSave,
    handleOpenChange,
  } = useFormSessionHost(COMMITMENT_FORM_SESSION_SOURCE);
  const completeSave = useCommitmentFormHostState.getState().completeSave;
  const completeClose = useCommitmentFormHostState.getState().completeClose;
  const hasSession = phase !== 'closed';

  const handleSaved = useCallback(
    (ownerSessionId: number) => {
      const { landing, mode: savedMode } = useCommitmentFormHostState.getState();
      if (!completeSave(ownerSessionId, savedMode === 'edit' ? 'updated' : 'added')) return;
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
    const postCloseToast = completeClose(sessionId);
    if (postCloseToast === undefined) return;
    toast.show({ label: POST_CLOSE_TOAST_LABEL[postCloseToast], variant: 'success' });
  }, [completeClose, sessionId, toast]);

  return {
    state: {
      isOpen: phase === 'open',
      hasSession,
      sessionId,
      mode,
      editingCommitment,
      title: mode === 'edit' ? Strings.commitmentsEditTitle : Strings.commitmentsAddTitle,
      isDismissable: session.isDismissable,
      saving: footer.saving,
      statusMessage: footer.errorMessage,
      statusFootnote: footer.footnote,
    },
    registerSubmit,
    handleSave,
    handleOpenChange,
    handleSaved,
    handleDeactivated,
    handleCloseComplete,
  };
}
