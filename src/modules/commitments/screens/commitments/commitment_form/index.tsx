import { Sheet } from '@/components/ui/sheet';

import { CommitmentFormFooter } from '../components/commitment_form_body';
import { AddCommitmentSession } from './add_commitment_session';
import { useCommitmentFormHost } from './commitment_form_host.hook';
import { EditCommitmentSession } from './edit_commitment_session';

export function CommitmentFormHost(): React.ReactElement {
  const {
    state,
    registerSubmit,
    handleSave,
    handleOpenChange,
    handleClose,
    handleSaved,
    handleDeactivated,
    handleCloseComplete,
  } = useCommitmentFormHost();

  return (
    <Sheet
      isOpen={state.isOpen}
      onOpenChange={handleOpenChange}
      onCloseComplete={handleCloseComplete}
      title={state.title}
      size="lg"
      scrollable
      liftsAboveKeyboard
      isDismissable={state.isDismissable}
      footer={
        state.hasSession ? (
          <CommitmentFormFooter
            errorMessage={state.saveError}
            saving={state.saving}
            onSubmit={handleSave}
          />
        ) : undefined
      }
    >
      {state.hasSession && state.mode === 'add' ? (
        <AddCommitmentSession
          key={state.sessionId}
          sessionId={state.sessionId}
          onRegisterSubmit={registerSubmit}
          onSaved={handleSaved}
        />
      ) : null}
      {state.hasSession && state.mode === 'edit' && state.editingCommitmentId !== undefined ? (
        <EditCommitmentSession
          key={state.sessionId}
          sessionId={state.sessionId}
          commitmentId={state.editingCommitmentId}
          onRegisterSubmit={registerSubmit}
          onSaved={handleSaved}
          onDeactivated={handleDeactivated}
          onClose={handleClose}
        />
      ) : null}
    </Sheet>
  );
}
