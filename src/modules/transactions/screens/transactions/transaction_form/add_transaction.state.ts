import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

type AddTransactionSignalState = {
  visible: ReadonlySignal<boolean>;
  pendingOpen: ReadonlySignal<boolean>;
  saving: ReadonlySignal<boolean>;
  showAccountPicker: ReadonlySignal<boolean>;
  showToPicker: ReadonlySignal<boolean>;
  showCategoryPicker: ReadonlySignal<boolean>;
  rateOverride: ReadonlySignal<boolean>;
};

class AddTransactionState {
  private readonly visible = signal(false);
  private readonly pendingOpen = signal(false);
  private readonly saving = signal(false);
  private readonly showAccountPicker = signal(false);
  private readonly showToPicker = signal(false);
  private readonly showCategoryPicker = signal(false);
  private readonly rateOverride = signal(false);

  readonly state: AddTransactionSignalState = {
    visible: this.visible,
    pendingOpen: this.pendingOpen,
    saving: this.saving,
    showAccountPicker: this.showAccountPicker,
    showToPicker: this.showToPicker,
    showCategoryPicker: this.showCategoryPicker,
    rateOverride: this.rateOverride,
  };

  open = () => {
    batch(() => {
      this.visible.value = true;
      this.pendingOpen.value = false;
    });
  };
  requestOpen = () => {
    this.pendingOpen.value = true;
  };
  close = () => this.reset();
  setSaving = (v: boolean) => {
    this.saving.value = v;
  };
  setShowAccountPicker = (v: boolean) => {
    this.showAccountPicker.value = v;
  };
  setShowToPicker = (v: boolean) => {
    this.showToPicker.value = v;
  };
  setShowCategoryPicker = (v: boolean) => {
    this.showCategoryPicker.value = v;
  };
  setRateOverride = (v: boolean) => {
    this.rateOverride.value = v;
  };
  reset = () => {
    batch(() => {
      this.visible.value = false;
      this.pendingOpen.value = false;
      this.saving.value = false;
      this.showAccountPicker.value = false;
      this.showToPicker.value = false;
      this.showCategoryPicker.value = false;
      this.rateOverride.value = false;
    });
  };
}

const addTransactionState = new AddTransactionState();

export function useAddTransactionState(): AddTransactionState {
  return addTransactionState;
}
