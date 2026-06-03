import { batch, signal } from '@preact/signals-react';

interface TransactionFormBodyState {
  keyboardVisible: typeof keyboardVisible;
  showIosDatePicker: typeof showIosDatePicker;
  showAndroidDatePicker: typeof showAndroidDatePicker;
}

interface TransactionFormBodyActions {
  setKeyboardVisible: (v: boolean) => void;
  setShowIosDatePicker: (v: boolean) => void;
  setShowAndroidDatePicker: (v: boolean) => void;
  reset: () => void;
}

const keyboardVisible = signal(false);
const showIosDatePicker = signal(false);
const showAndroidDatePicker = signal(false);

function setKeyboardVisible(v: boolean): void {
  keyboardVisible.value = v;
}

function setShowIosDatePicker(v: boolean): void {
  showIosDatePicker.value = v;
}

function setShowAndroidDatePicker(v: boolean): void {
  showAndroidDatePicker.value = v;
}

function reset(): void {
  batch(() => {
    keyboardVisible.value = false;
    showIosDatePicker.value = false;
    showAndroidDatePicker.value = false;
  });
}

export function useTransactionFormBodyState(): {
  state: TransactionFormBodyState;
} & TransactionFormBodyActions {
  return {
    state: {
      keyboardVisible,
      showIosDatePicker,
      showAndroidDatePicker,
    },
    setKeyboardVisible,
    setShowIosDatePicker,
    setShowAndroidDatePicker,
    reset,
  };
}
