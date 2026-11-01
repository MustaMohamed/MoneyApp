import { FormSheetFooter } from '@/components/ui/form_sheet_footer';
import { Sheet } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';

import { useCommitmentFormHost } from './commitment_form_host.hook';
import { AddCommitmentSession } from './components/add_commitment_session';
import { EditCommitmentSession } from './components/edit_commitment_session';

export function CommitmentFormHost(): React.ReactElement {
  const {
    state,
    registerSubmit,
    handleSave,
    handleOpenChange,
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
          <FormSheetFooter
            statusTestID="commitment-form-status"
            showsStatusTrack
            footnote={state.statusFootnote}
            message={state.statusMessage}
            label={Strings.commitmentsSave}
            isLoading={state.saving}
            onPress={handleSave}
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
      {state.hasSession && state.mode === 'edit' && state.editingCommitment !== undefined ? (
        <EditCommitmentSession
          key={state.sessionId}
          sessionId={state.sessionId}
          commitment={state.editingCommitment}
          onRegisterSubmit={registerSubmit}
          onSaved={handleSaved}
          onDeactivated={handleDeactivated}
        />
      ) : null}
    </Sheet>
  );
}
