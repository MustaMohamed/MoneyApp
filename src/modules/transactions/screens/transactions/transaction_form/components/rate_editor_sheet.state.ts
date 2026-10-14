import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface RateEditorSheetStateShape {
  activeOwnerId: string | undefined;
  isOpen: boolean;
  draft: string;
  error: string | undefined;
}

type RateEditorSheetState = RateEditorSheetStateShape & {
  open: (ownerId: string, rateText: string) => void;
  setDraft: (ownerId: string, text: string) => void;
  refuse: (ownerId: string, message: string) => void;
  close: (ownerId: string) => void;
  release: (ownerId: string) => void;
  reset: () => void;
};

const INITIAL_STATE: RateEditorSheetStateShape = {
  activeOwnerId: undefined,
  isOpen: false,
  draft: '',
  error: undefined,
};

export const useRateEditorSheetState = createMoneyAppSelectors(
  create<RateEditorSheetState>((set) => ({
    ...INITIAL_STATE,

    open: (activeOwnerId, rateText) =>
      set({ activeOwnerId, isOpen: true, draft: rateText, error: undefined }),
    setDraft: (ownerId, draft) =>
      set((state) => (state.activeOwnerId === ownerId ? { draft, error: undefined } : {})),
    refuse: (ownerId, error) => set((state) => (state.activeOwnerId === ownerId ? { error } : {})),
    // The draft stays so the field does not empty while the sheet animates out.
    close: (ownerId) => set((state) => (state.activeOwnerId === ownerId ? { isOpen: false } : {})),
    release: (ownerId) => set((state) => (state.activeOwnerId === ownerId ? INITIAL_STATE : {})),
    reset: () => set(INITIAL_STATE),
  })),
);
