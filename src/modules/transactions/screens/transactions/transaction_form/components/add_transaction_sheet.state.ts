import { useEffect } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

const CLOSE_UNMOUNT_DELAY_MS = 350;

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

export function useAddTransactionSheetLifecycle(visible: boolean) {
  const state = useAddTransactionSheetState(
    useShallow((sheet) => ({
      readyToOpen: sheet.readyToOpen,
      shouldRenderInner: sheet.shouldRenderInner,
      hasFooter: sheet.hasFooter,
      saving: sheet.saving,
      saveDisabled: sheet.saveDisabled,
      saveAction: sheet.saveAction,
    })),
  );
  const prepareOpen = useAddTransactionSheetState.getState().prepareOpen;
  const show = useAddTransactionSheetState.getState().show;
  const startClose = useAddTransactionSheetState.getState().startClose;
  const finishClose = useAddTransactionSheetState.getState().finishClose;

  useEffect(() => {
    if (!visible) {
      startClose();
      const timer = setTimeout(finishClose, CLOSE_UNMOUNT_DELAY_MS);
      return () => clearTimeout(timer);
    }

    prepareOpen();
    const timer = setTimeout(show, 0);
    return () => clearTimeout(timer);
  }, [finishClose, prepareOpen, show, startClose, visible]);

  return state;
}
