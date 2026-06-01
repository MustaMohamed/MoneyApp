import { batch, type Signal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

type AccountDetailState = {
  isEditing: Signal<boolean>;
  isAdjustVisible: Signal<boolean>;
  isArchiveVisible: Signal<boolean>;
  isSaving: Signal<boolean>;
  isAdjusting: Signal<boolean>;
  isArchiving: Signal<boolean>;
};

type AccountDetailActions = {
  setEditing: (v: boolean) => void;
  setAdjustVisible: (v: boolean) => void;
  setArchiveVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAdjusting: (v: boolean) => void;
  setArchiving: (v: boolean) => void;
  reset: () => void;
};

export function useAccountDetailState(): { state: AccountDetailState } & AccountDetailActions {
  const isEditing = useSignal(false);
  const isAdjustVisible = useSignal(false);
  const isArchiveVisible = useSignal(false);
  const isSaving = useSignal(false);
  const isAdjusting = useSignal(false);
  const isArchiving = useSignal(false);

  const setEditing = useCallback(
    (v: boolean) => {
      isEditing.value = v;
    },
    [isEditing],
  );
  const setAdjustVisible = useCallback(
    (v: boolean) => {
      isAdjustVisible.value = v;
    },
    [isAdjustVisible],
  );
  const setArchiveVisible = useCallback(
    (v: boolean) => {
      isArchiveVisible.value = v;
    },
    [isArchiveVisible],
  );
  const setSaving = useCallback(
    (v: boolean) => {
      isSaving.value = v;
    },
    [isSaving],
  );
  const setAdjusting = useCallback(
    (v: boolean) => {
      isAdjusting.value = v;
    },
    [isAdjusting],
  );
  const setArchiving = useCallback(
    (v: boolean) => {
      isArchiving.value = v;
    },
    [isArchiving],
  );
  const reset = useCallback(() => {
    batch(() => {
      isEditing.value = false;
      isAdjustVisible.value = false;
      isArchiveVisible.value = false;
      isSaving.value = false;
      isAdjusting.value = false;
      isArchiving.value = false;
    });
  }, [isAdjustVisible, isAdjusting, isArchiveVisible, isArchiving, isEditing, isSaving]);

  return {
    state: {
      isEditing,
      isAdjustVisible,
      isArchiveVisible,
      isSaving,
      isAdjusting,
      isArchiving,
    },
    setEditing,
    setAdjustVisible,
    setArchiveVisible,
    setSaving,
    setAdjusting,
    setArchiving,
    reset,
  };
}
