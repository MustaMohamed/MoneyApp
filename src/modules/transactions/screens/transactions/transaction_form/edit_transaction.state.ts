import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

type EditTransactionSignalState = {
  visible: ReadonlySignal<boolean>;
  saving: ReadonlySignal<boolean>;
  showCategoryPicker: ReadonlySignal<boolean>;
  rateOverride: ReadonlySignal<boolean>;
};

class EditTransactionState {
  private readonly visible = signal(false);
  private readonly saving = signal(false);
  private readonly showCategoryPicker = signal(false);
  private readonly rateOverride = signal(false);

  readonly state: EditTransactionSignalState = {
    visible: this.visible,
    saving: this.saving,
    showCategoryPicker: this.showCategoryPicker,
    rateOverride: this.rateOverride,
  };

  open = (_tx: Transaction) => {
    this.visible.value = true;
  };
  close = () => this.reset();
  setSaving = (v: boolean) => {
    this.saving.value = v;
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
      this.saving.value = false;
      this.showCategoryPicker.value = false;
      this.rateOverride.value = false;
    });
  };
}

const editTransactionState = new EditTransactionState();

export function useEditTransactionState(): EditTransactionState {
  return editTransactionState;
}
