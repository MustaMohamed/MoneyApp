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

const POST_CLOSE_TOAST_LABEL: Record<Exclude<CommitmentFormPostCloseToast, 'stopped'>, string> = {
  added: Strings.commitmentsAddedToast,
  updated: Strings.commitmentsUpdatedToast,
};

export function useCommitmentFormHost() {
  const { toast } = useToast();
  const {
    phase,
    sessionId,
    mode,
    editingCommitment,
    editingSettledDueDates,
    editingStopCounts,
    footer,
  } = useCommitmentFormHostState(
    useShallow((state) => ({
      phase: state.phase,
      sessionId: state.sessionId,
      mode: state.mode,
      editingCommitment: state.editingCommitment,
      editingSettledDueDates: state.editingSettledDueDates,
      editingStopCounts: state.editingStopCounts,
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

  // The detail's exit waits for the sheet to close: its landing runs from `handleCloseComplete`.
  const handleStopped = useCallback(
    (ownerSessionId: number) => {
      completeSave(ownerSessionId, 'stopped');
    },
    [completeSave],
  );

  const handleCloseComplete = useCallback(() => {
    const { landing } = useCommitmentFormHostState.getState();
    const postCloseToast = completeClose(sessionId);
    if (postCloseToast === undefined) return;
    if (postCloseToast === 'stopped') {
      landing?.onStopped?.();
      return;
    }
    toast.show({ label: POST_CLOSE_TOAST_LABEL[postCloseToast], variant: 'success' });
  }, [completeClose, sessionId, toast]);

  return {
    state: {
      isOpen: phase === 'open',
      hasSession,
      sessionId,
      mode,
      editingCommitment,
      editingSettledDueDates,
      editingStopCounts,
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
    handleStopped,
    handleCloseComplete,
  };
}
