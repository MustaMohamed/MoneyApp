import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { useSheetEngineIndex } from '@/components/ui/sheet_engine_index.anim';
import { StatusTrack } from '@/components/ui/status_track';
import { Strings } from '@/constants/strings';

import { AddTransactionSession } from './add_transaction_session';
import { TRANSACTION_FORM_STATUS_GAP } from './components/transaction_form.geometry';
import { EditTransactionSession } from './edit_transaction_session';
import { useTransactionFormHost } from './transaction_form_host.hook';

interface SheetEngineWatcherProps {
  onIndex: (index: number) => boolean;
}

// Rendered inside the sheet's children, the only place gorhom's context reaches.
function SheetEngineWatcher({ onIndex }: SheetEngineWatcherProps): null {
  useSheetEngineIndex(onIndex);
  return null;
}

export function TransactionFormHost(): React.ReactElement {
  const {
    state,
    registerSubmit,
    handleSave,
    handleOpenChange,
    handleClose,
    handleSaved,
    handleRequestAccountCreation,
    handleCloseComplete,
    handleEngineIndex,
  } = useTransactionFormHost();

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
        state.footer.visible ? (
          <View>
            {state.showsStatusTrack ? (
              <>
                <StatusTrack testID="transaction-form-status" message={state.footer.status} />
                <View style={{ height: TRANSACTION_FORM_STATUS_GAP }} />
              </>
            ) : null}
            <Button
              variant="primary"
              flat
              label={state.mode === 'edit' ? Strings.editTxSaveCta : Strings.addTxSaveCta}
              isLoading={state.footer.saving}
              isDisabled={state.footer.disabled}
              onPress={handleSave}
            />
          </View>
        ) : undefined
      }
    >
      <SheetEngineWatcher onIndex={handleEngineIndex} />
      {state.mode === 'add' ? (
        <AddTransactionSession
          key={state.sessionId}
          sessionId={state.sessionId}
          onRegisterSubmit={registerSubmit}
          onSaved={handleSaved}
          onRequestAccountCreation={handleRequestAccountCreation}
        />
      ) : state.mode === 'edit' && state.editingTx ? (
        <EditTransactionSession
          key={state.sessionId}
          sessionId={state.sessionId}
          tx={state.editingTx}
          onRegisterSubmit={registerSubmit}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      ) : null}
    </Sheet>
  );
}
