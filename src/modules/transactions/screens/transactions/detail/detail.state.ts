import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

type TxDetailSignalState = {
  confirmVisible: ReadonlySignal<boolean>;
  deleting: ReadonlySignal<boolean>;
  reloadKey: ReadonlySignal<number>;
};

class TxDetailState {
  private readonly confirmVisible = signal(false);
  private readonly deleting = signal(false);
  private readonly reloadKey = signal(0);

  readonly state: TxDetailSignalState = {
    confirmVisible: this.confirmVisible,
    deleting: this.deleting,
    reloadKey: this.reloadKey,
  };

  setConfirmVisible = (v: boolean) => {
    this.confirmVisible.value = v;
  };
  setDeleting = (v: boolean) => {
    this.deleting.value = v;
  };
  bumpReload = () => {
    this.reloadKey.value += 1;
  };
  reset = () => {
    batch(() => {
      this.confirmVisible.value = false;
      this.deleting.value = false;
      this.reloadKey.value = 0;
    });
  };
}

const txDetailState = new TxDetailState();

export function useTxDetailState(): TxDetailState {
  return txDetailState;
}
