import { batch, type ReadonlySignal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

type CommitmentFormBodyState = {
  categoryPickerVisible: ReadonlySignal<boolean>;
  accountPickerVisible: ReadonlySignal<boolean>;
  showStartDatePicker: ReadonlySignal<boolean>;
  showEndDatePicker: ReadonlySignal<boolean>;
};

type CommitmentFormBodyActions = {
  setCategoryPickerVisible: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  setShowStartDatePicker: (v: boolean) => void;
  setShowEndDatePicker: (v: boolean) => void;
  reset: () => void;
};

export function useCommitmentFormBodyState(): {
  state: CommitmentFormBodyState;
} & CommitmentFormBodyActions {
  const categoryPickerVisible = useSignal(false);
  const accountPickerVisible = useSignal(false);
  const showStartDatePicker = useSignal(false);
  const showEndDatePicker = useSignal(false);

  const setCategoryPickerVisible = useCallback(
    (v: boolean) => {
      categoryPickerVisible.value = v;
    },
    [categoryPickerVisible],
  );

  const setAccountPickerVisible = useCallback(
    (v: boolean) => {
      accountPickerVisible.value = v;
    },
    [accountPickerVisible],
  );

  const setShowStartDatePicker = useCallback(
    (v: boolean) => {
      showStartDatePicker.value = v;
    },
    [showStartDatePicker],
  );

  const setShowEndDatePicker = useCallback(
    (v: boolean) => {
      showEndDatePicker.value = v;
    },
    [showEndDatePicker],
  );

  const reset = useCallback(() => {
    batch(() => {
      categoryPickerVisible.value = false;
      accountPickerVisible.value = false;
      showStartDatePicker.value = false;
      showEndDatePicker.value = false;
    });
  }, [accountPickerVisible, categoryPickerVisible, showEndDatePicker, showStartDatePicker]);

  return {
    state: {
      categoryPickerVisible,
      accountPickerVisible,
      showStartDatePicker,
      showEndDatePicker,
    },
    setCategoryPickerVisible,
    setAccountPickerVisible,
    setShowStartDatePicker,
    setShowEndDatePicker,
    reset,
  };
}
