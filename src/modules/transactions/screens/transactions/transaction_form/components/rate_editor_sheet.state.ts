import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface RateEditorSheetStateShape {
  activeOwnerId: string | undefined;
  isOpen: boolean;
  draft: string;
  error: string | undefined;
  /** The sheet reported this open settled, so its close reports a settled close too. */
  openSettled: boolean;
  /** A settled open's close that has not settled: a reopen inside it gets no index report, so no focus. */
  closing: boolean;
}

type RateEditorSheetState = RateEditorSheetStateShape & {
  open: (ownerId: string, rateText: string) => void;
  settleOpen: (ownerId: string) => void;
  setDraft: (ownerId: string, text: string) => void;
  refuse: (ownerId: string, message: string) => void;
  close: (ownerId: string) => void;
  settleClose: (ownerId: string) => void;
  release: (ownerId: string) => void;
  reset: () => void;
};

const INITIAL_STATE: RateEditorSheetStateShape = {
  activeOwnerId: undefined,
  isOpen: false,
  draft: '',
  error: undefined,
  openSettled: false,
  closing: false,
};

export const useRateEditorSheetState = createMoneyAppSelectors(
  create<RateEditorSheetState>((set) => ({
    ...INITIAL_STATE,

    open: (activeOwnerId, rateText) =>
      set((state) =>
        state.closing && state.activeOwnerId === activeOwnerId
          ? {}
          : {
              activeOwnerId,
              isOpen: true,
              draft: rateText,
              error: undefined,
              openSettled: false,
              closing: false,
            },
      ),
    settleOpen: (ownerId) =>
      set((state) =>
        state.activeOwnerId === ownerId && state.isOpen ? { openSettled: true } : {},
      ),
    setDraft: (ownerId, draft) =>
      set((state) => (state.activeOwnerId === ownerId ? { draft, error: undefined } : {})),
    refuse: (ownerId, error) => set((state) => (state.activeOwnerId === ownerId ? { error } : {})),
    // The draft stays so the field does not empty while the sheet animates out.
    close: (ownerId) =>
      set((state) =>
        state.activeOwnerId === ownerId
          ? {
              isOpen: false,
              openSettled: false,
              closing: state.closing || (state.isOpen && state.openSettled),
            }
          : {},
      ),
    settleClose: (ownerId) =>
      set((state) => (state.activeOwnerId === ownerId ? { closing: false } : {})),
    release: (ownerId) => set((state) => (state.activeOwnerId === ownerId ? INITIAL_STATE : {})),
    reset: () => set(INITIAL_STATE),
  })),
);
