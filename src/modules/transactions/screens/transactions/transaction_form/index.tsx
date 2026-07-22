import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';

import { AddTransactionSession } from './add_transaction_session';
import { EditTransactionSession } from './edit_transaction_session';
import { useTransactionFormHost } from './transaction_form_host.hook';

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
  } = useTransactionFormHost();

  return (
    <Sheet
      isOpen={state.isOpen}
      onOpenChange={handleOpenChange}
      onCloseComplete={handleCloseComplete}
      title={state.title}
      size="lg"
      scrollable
      isDismissable={state.isDismissable}
      footer={
        state.footer.visible ? (
          <Button
            variant="primary"
            label={state.mode === 'edit' ? Strings.editTxSaveCta : Strings.addTxSaveCta}
            isLoading={state.footer.saving}
            isDisabled={state.footer.disabled}
            onPress={handleSave}
          />
        ) : undefined
      }
    >
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
