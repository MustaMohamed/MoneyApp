import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

type TransactionFormBodySignalState = {
  keyboardVisible: ReadonlySignal<boolean>;
  showIosDatePicker: ReadonlySignal<boolean>;
  showAndroidDatePicker: ReadonlySignal<boolean>;
};

class TransactionFormBodyState {
  private readonly keyboardVisible = signal(false);
  private readonly showIosDatePicker = signal(false);
  private readonly showAndroidDatePicker = signal(false);

  readonly state: TransactionFormBodySignalState = {
    keyboardVisible: this.keyboardVisible,
    showIosDatePicker: this.showIosDatePicker,
    showAndroidDatePicker: this.showAndroidDatePicker,
  };

  setKeyboardVisible = (v: boolean) => {
    this.keyboardVisible.value = v;
  };
  setShowIosDatePicker = (v: boolean) => {
    this.showIosDatePicker.value = v;
  };
  setShowAndroidDatePicker = (v: boolean) => {
    this.showAndroidDatePicker.value = v;
  };
  reset = () => {
    batch(() => {
      this.keyboardVisible.value = false;
      this.showIosDatePicker.value = false;
      this.showAndroidDatePicker.value = false;
    });
  };
}

const transactionFormBodyState = new TransactionFormBodyState();

export function useTransactionFormBodyState(): TransactionFormBodyState {
  return transactionFormBodyState;
}
