import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AddTransactionSheetStateShape {
  readyToOpen: boolean;
  shouldRenderInner: boolean;
  hasFooter: boolean;
  saving: boolean;
  saveDisabled: boolean;
  saveAction: (() => void) | undefined;
}

type AddTransactionSheetState = AddTransactionSheetStateShape & {
  prepareOpen: () => void;
  show: () => void;
  startClose: () => void;
  finishClose: () => void;
  publishFooter: (
    hasFooter: boolean,
    saving: boolean,
    saveDisabled: boolean,
    saveAction: () => void,
  ) => void;
  clearFooter: () => void;
  reset: () => void;
};

const INITIAL_STATE: AddTransactionSheetStateShape = {
  readyToOpen: false,
  shouldRenderInner: false,
  hasFooter: false,
  saving: false,
  saveDisabled: false,
  saveAction: undefined,
};

export const useAddTransactionSheetState = createMoneyAppSelectors(
  create<AddTransactionSheetState>((set) => ({
    ...INITIAL_STATE,
    prepareOpen: () => set({ readyToOpen: false }),
    show: () => set({ readyToOpen: true, shouldRenderInner: true }),
    startClose: () => set({ readyToOpen: false }),
    finishClose: () => set(INITIAL_STATE),
    publishFooter: (hasFooter, saving, saveDisabled, saveAction) =>
      set({ hasFooter, saving, saveDisabled, saveAction }),
    clearFooter: () =>
      set({ hasFooter: false, saving: false, saveDisabled: false, saveAction: undefined }),
    reset: () => set(INITIAL_STATE),
  })),
);
