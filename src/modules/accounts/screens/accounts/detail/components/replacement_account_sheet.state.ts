import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface ReplacementAccountSheetStateShape {
  isVisible: boolean;
  replacementAccountId: string | undefined;
  isMovingAndDeleting: boolean;
  moveAndDeleteError: string | undefined;
}

type ReplacementAccountSheetState = ReplacementAccountSheetStateShape & {
  open: (replacementAccountId: string) => void;
  setVisible: (v: boolean) => void;
  setReplacementAccountId: (id: string | undefined) => void;
  setMovingAndDeleting: (v: boolean) => void;
  setMoveAndDeleteError: (message: string | undefined) => void;
  reset: () => void;
};

const INITIAL_STATE: ReplacementAccountSheetStateShape = {
  isVisible: false,
  replacementAccountId: undefined,
  isMovingAndDeleting: false,
  moveAndDeleteError: undefined,
};

export const useReplacementAccountSheetState = createMoneyAppSelectors(
  create<ReplacementAccountSheetState>((set) => ({
    ...INITIAL_STATE,
    open: (replacementAccountId) =>
      set({ isVisible: true, replacementAccountId, moveAndDeleteError: undefined }),
    setVisible: (v) => set({ isVisible: v }),
    setReplacementAccountId: (id) => set({ replacementAccountId: id }),
    setMovingAndDeleting: (v) => set({ isMovingAndDeleting: v }),
    setMoveAndDeleteError: (message) => set({ moveAndDeleteError: message }),
    reset: () => set(INITIAL_STATE),
  })),
);
