import { batch, signal } from '@preact/signals-react';

interface AddTransactionState {
  visible: typeof visible;
  /**
   * Cross-tab open request. The global FAB (mounted outside the transactions
   * tab) sets this and navigates here; the transactions screen consumes it once
   * mounted, flipping `visible` false→true so the sheet actually presents. (The
   * FAB can't set `visible` directly: the sheet would mount already-true and
   * skip the open animation while still hiding the FAB.)
   */
  pendingOpen: typeof pendingOpen;
  saving: typeof saving;
  showAccountPicker: typeof showAccountPicker;
  showToPicker: typeof showToPicker;
  showCategoryPicker: typeof showCategoryPicker;
  rateOverride: typeof rateOverride;
}

interface AddTransactionActions {
  open: () => void;
  requestOpen: () => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowAccountPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
}

const visible = signal(false);
const pendingOpen = signal(false);
const saving = signal(false);
const showAccountPicker = signal(false);
const showToPicker = signal(false);
const showCategoryPicker = signal(false);
const rateOverride = signal(false);

function reset(): void {
  batch(() => {
    visible.value = false;
    pendingOpen.value = false;
    saving.value = false;
    showAccountPicker.value = false;
    showToPicker.value = false;
    showCategoryPicker.value = false;
    rateOverride.value = false;
  });
}

function open(): void {
  batch(() => {
    visible.value = true;
    pendingOpen.value = false;
  });
}

function requestOpen(): void {
  pendingOpen.value = true;
}

function setSaving(v: boolean): void {
  saving.value = v;
}

function setShowAccountPicker(v: boolean): void {
  showAccountPicker.value = v;
}

function setShowToPicker(v: boolean): void {
  showToPicker.value = v;
}

function setShowCategoryPicker(v: boolean): void {
  showCategoryPicker.value = v;
}

function setRateOverride(v: boolean): void {
  rateOverride.value = v;
}

export function useAddTransactionState(): { state: AddTransactionState } & AddTransactionActions {
  return {
    state: {
      visible,
      pendingOpen,
      saving,
      showAccountPicker,
      showToPicker,
      showCategoryPicker,
      rateOverride,
    },
    open,
    requestOpen,
    close: reset,
    setSaving,
    setShowAccountPicker,
    setShowToPicker,
    setShowCategoryPicker,
    setRateOverride,
    reset,
  };
}
