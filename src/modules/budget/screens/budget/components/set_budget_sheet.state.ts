import { batch, type Signal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

interface SetBudgetSheetStateShape {
  selectedCategoryId: Signal<string | undefined>;
  pickerExpanded: Signal<boolean>;
}

type SetBudgetSheetStateActions = {
  initAddMode: (firstCategoryId: string | undefined) => void;
  setSelectedCategoryId: (id: string) => void;
  togglePicker: () => void;
  collapsePicker: () => void;
  reset: () => void;
};

export function useSetBudgetSheetState(): {
  state: SetBudgetSheetStateShape;
} & SetBudgetSheetStateActions {
  const selectedCategoryId = useSignal<string | undefined>(undefined);
  const pickerExpanded = useSignal(false);

  const initAddMode = useCallback(
    (firstCategoryId: string | undefined) => {
      batch(() => {
        selectedCategoryId.value = firstCategoryId;
        pickerExpanded.value = false;
      });
    },
    [pickerExpanded, selectedCategoryId],
  );

  const setSelectedCategoryId = useCallback(
    (id: string) => {
      batch(() => {
        selectedCategoryId.value = id;
        pickerExpanded.value = false;
      });
    },
    [pickerExpanded, selectedCategoryId],
  );

  const togglePicker = useCallback(() => {
    pickerExpanded.value = !pickerExpanded.value;
  }, [pickerExpanded]);

  const collapsePicker = useCallback(() => {
    pickerExpanded.value = false;
  }, [pickerExpanded]);

  const reset = useCallback(() => {
    batch(() => {
      selectedCategoryId.value = undefined;
      pickerExpanded.value = false;
    });
  }, [pickerExpanded, selectedCategoryId]);

  return {
    state: {
      selectedCategoryId,
      pickerExpanded,
    },
    initAddMode,
    setSelectedCategoryId,
    togglePicker,
    collapsePicker,
    reset,
  };
}
