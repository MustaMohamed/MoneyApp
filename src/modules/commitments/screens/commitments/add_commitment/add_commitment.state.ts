import { type Signal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

type AddCommitmentState = {
  saving: Signal<boolean>;
};

type AddCommitmentActions = {
  setSaving: (v: boolean) => void;
  reset: () => void;
};

export function useAddCommitmentState(): {
  state: AddCommitmentState;
} & AddCommitmentActions {
  const saving = useSignal(false);

  const setSaving = useCallback(
    (v: boolean) => {
      saving.value = v;
    },
    [saving],
  );

  const reset = useCallback(() => {
    saving.value = false;
  }, [saving]);

  return {
    state: { saving },
    setSaving,
    reset,
  };
}
