import { batch, signal } from '@preact/signals-react';

interface EditTransactionState {
  visible: typeof visible;
  saving: typeof saving;
  showCategoryPicker: typeof showCategoryPicker;
  rateOverride: typeof rateOverride;
}

interface EditTransactionActions {
  open: () => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
}

const visible = signal(false);
const saving = signal(false);
const showCategoryPicker = signal(false);
const rateOverride = signal(false);

function open(): void {
  visible.value = true;
}

function reset(): void {
  batch(() => {
    visible.value = false;
    saving.value = false;
    showCategoryPicker.value = false;
    rateOverride.value = false;
  });
}

function setSaving(v: boolean): void {
  saving.value = v;
}

function setShowCategoryPicker(v: boolean): void {
  showCategoryPicker.value = v;
}

function setRateOverride(v: boolean): void {
  rateOverride.value = v;
}

export function useEditTransactionState(): {
  state: EditTransactionState;
} & EditTransactionActions {
  return {
    state: {
      visible,
      saving,
      showCategoryPicker,
      rateOverride,
    },
    open,
    close: reset,
    setSaving,
    setShowCategoryPicker,
    setRateOverride,
    reset,
  };
}
