import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FORM_SHEET_STATUS_GAP } from '@/components/ui/form_sheet.geometry';
import { Sheet } from '@/components/ui/sheet';
import { StatusTrack } from '@/components/ui/status_track';
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
          <View>
            <StatusTrack
              testID="commitment-form-status"
              footnote={state.statusFootnote}
              message={state.statusMessage}
            />
            <View style={{ height: FORM_SHEET_STATUS_GAP }} />
            <Button
              variant="primary"
              flat
              label={Strings.commitmentsSave}
              isLoading={state.saving}
              onPress={handleSave}
            />
          </View>
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
