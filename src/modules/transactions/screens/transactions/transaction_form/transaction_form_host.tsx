import { AddTransactionSheet, EditTransactionSheet } from './index';
import { useTransactionFormHost } from './transaction_form_host.hook';

export function TransactionFormHost(): React.ReactElement | null {
  const { state, handleReady, handleClose, handleSaved, handleCloseComplete } =
    useTransactionFormHost();

  if (state.mode === 'add') {
    return (
      <AddTransactionSheet
        visible={state.visible}
        sessionId={state.sessionId}
        onReady={handleReady}
        onClose={handleClose}
        onSaved={handleSaved}
        onCloseComplete={handleCloseComplete}
      />
    );
  }

  if (state.mode === 'edit' && state.editingTx) {
    return (
      <EditTransactionSheet
        visible={state.visible}
        sessionId={state.sessionId}
        tx={state.editingTx}
        onReady={handleReady}
        onClose={handleClose}
        onSaved={handleSaved}
        onCloseComplete={handleCloseComplete}
      />
    );
  }

  return null;
}
