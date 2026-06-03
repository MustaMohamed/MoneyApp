import { batch, signal, type Signal } from '@preact/signals-react';
import { useCallback } from 'react';

type PaySheetState = {
  visible: Signal<boolean>;
  saving: Signal<boolean>;
  accountPickerVisible: Signal<boolean>;
  rateOverride: Signal<boolean>;
};

type PaySheetActions = {
  setVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
};

const sharedPaySheetState: PaySheetState = {
  visible: signal(false),
  saving: signal(false),
  accountPickerVisible: signal(false),
  rateOverride: signal(false),
};

export function usePaySheetState(): {
  state: PaySheetState;
} & PaySheetActions {
  const { visible, saving, accountPickerVisible, rateOverride } = sharedPaySheetState;

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

  const reset = useCallback(() => {
    batch(() => {
      visible.value = false;
      saving.value = false;
      accountPickerVisible.value = false;
      rateOverride.value = false;
    });
  }, [accountPickerVisible, rateOverride, saving, visible]);

  return {
    state: {
      visible,
      saving,
      accountPickerVisible,
      rateOverride,
    },
    setVisible,
    setSaving,
    setAccountPickerVisible,
    setRateOverride,
    reset,
  };
}
