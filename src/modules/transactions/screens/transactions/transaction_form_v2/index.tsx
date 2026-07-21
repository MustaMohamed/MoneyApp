import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';

import { AddTransactionV2Session } from './add_transaction_session';
import { EditTransactionV2Session } from './edit_transaction_session';
import { useTransactionFormV2Host } from './transaction_form_v2.hook';

export function TransactionFormV2Host(): React.ReactElement {
  const {
    state,
    registerSubmit,
    handleSave,
    handleOpenChange,
    handleClose,
    handleSaved,
    handleCloseComplete,
  } = useTransactionFormV2Host();

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
        <AddTransactionV2Session
          key={state.sessionId}
          sessionId={state.sessionId}
          onRegisterSubmit={registerSubmit}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      ) : state.mode === 'edit' && state.editingTx ? (
        <EditTransactionV2Session
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
