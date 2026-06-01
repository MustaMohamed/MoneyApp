import { batch, type ReadonlySignal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

export type PaySheetState = {
  visible: ReadonlySignal<boolean>;
  saving: ReadonlySignal<boolean>;
  accountPickerVisible: ReadonlySignal<boolean>;
  rateOverride: ReadonlySignal<boolean>;
  showIosDatePicker: ReadonlySignal<boolean>;
};

export type PaySheetActions = {
  setVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  toggleIosDatePicker: () => void;
  reset: () => void;
};

export type PaySheetStateApi = { state: PaySheetState } & PaySheetActions;

export function usePaySheetState(): PaySheetStateApi {
  const visible = useSignal(false);
  const saving = useSignal(false);
  const accountPickerVisible = useSignal(false);
  const rateOverride = useSignal(false);
  const showIosDatePicker = useSignal(false);

  const setVisible = useCallback(
    (v: boolean) => {
      visible.value = v;
    },
    [visible],
  );

  const setSaving = useCallback(
    (v: boolean) => {
      saving.value = v;
    },
    [saving],
  );

  const setAccountPickerVisible = useCallback(
    (v: boolean) => {
      accountPickerVisible.value = v;
    },
    [accountPickerVisible],
  );

  const setRateOverride = useCallback(
    (v: boolean) => {
      rateOverride.value = v;
    },
    [rateOverride],
  );

  const toggleIosDatePicker = useCallback(() => {
    showIosDatePicker.value = !showIosDatePicker.value;
  }, [showIosDatePicker]);

  const reset = useCallback(() => {
    batch(() => {
      visible.value = false;
      saving.value = false;
      accountPickerVisible.value = false;
      rateOverride.value = false;
      showIosDatePicker.value = false;
    });
  }, [accountPickerVisible, rateOverride, saving, showIosDatePicker, visible]);

  return {
    state: { visible, saving, accountPickerVisible, rateOverride, showIosDatePicker },
    setVisible,
    setSaving,
    setAccountPickerVisible,
    setRateOverride,
    toggleIosDatePicker,
    reset,
  };
}
