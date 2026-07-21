import { useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useTransactionFormHostState } from './transaction_form_host.state';

export function useTransactionFormHost() {
  const { mode, phase, sessionId, editingTx, onEditSaved } = useTransactionFormHostState(
    useShallow((host) => ({
      mode: host.mode,
      phase: host.phase,
      sessionId: host.sessionId,
      editingTx: host.editingTx,
      onEditSaved: host.onEditSaved,
    })),
  );
  const present = useTransactionFormHostState.getState().present;
  const requestClose = useTransactionFormHostState.getState().requestClose;
  const completeSave = useTransactionFormHostState.getState().completeSave;
  const completeClose = useTransactionFormHostState.getState().completeClose;

  useEffect(() => {
    if (phase === 'closed') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => subscription.remove();
  }, [phase, requestClose]);

  const handleReady = useCallback((sessionId: number) => present(sessionId), [present]);
  const handleClose = useCallback(() => requestClose(), [requestClose]);
  const handleSaved = useCallback(() => {
    completeSave();
    onEditSaved?.();
  }, [completeSave, onEditSaved]);
  const handleCloseComplete = useCallback(
    () => completeClose(sessionId),
    [completeClose, sessionId],
  );

  return {
    state: {
      mode,
      phase,
      sessionId,
      editingTx,
      visible: phase === 'open',
    },
    handleReady,
    handleClose,
    handleSaved,
    handleCloseComplete,
  };
}
