import { batch, signal } from '@preact/signals-react';

const confirmVisible = signal(false);
const deleting = signal(false);
const reloadKey = signal(0);

function setConfirmVisible(v: boolean): void {
  confirmVisible.value = v;
}

function setDeleting(v: boolean): void {
  deleting.value = v;
}

function bumpReload(): void {
  reloadKey.value += 1;
}

function reset(): void {
  batch(() => {
    confirmVisible.value = false;
    deleting.value = false;
    reloadKey.value = 0;
  });
}

export function useTxDetailState() {
  return {
    state: {
      confirmVisible,
      deleting,
      reloadKey,
    },
    setConfirmVisible,
    setDeleting,
    bumpReload,
    reset,
  };
}
