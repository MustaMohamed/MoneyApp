import { batch, type Signal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

type EditCommitmentState = {
  saving: Signal<boolean>;
  deactivateDialogVisible: Signal<boolean>;
};

type EditCommitmentActions = {
  setSaving: (v: boolean) => void;
  setDeactivateDialogVisible: (v: boolean) => void;
  reset: () => void;
};

export function useEditCommitmentState(): {
  state: EditCommitmentState;
} & EditCommitmentActions {
  const saving = useSignal(false);
  const deactivateDialogVisible = useSignal(false);

  const setSaving = useCallback(
    (v: boolean) => {
      saving.value = v;
    },
    [saving],
  );

  const setDeactivateDialogVisible = useCallback(
    (v: boolean) => {
      deactivateDialogVisible.value = v;
    },
    [deactivateDialogVisible],
  );

  const reset = useCallback(() => {
    batch(() => {
      saving.value = false;
      deactivateDialogVisible.value = false;
    });
  }, [deactivateDialogVisible, saving]);

  return {
    state: {
      saving,
      deactivateDialogVisible,
    },
    setSaving,
    setDeactivateDialogVisible,
    reset,
  };
}
