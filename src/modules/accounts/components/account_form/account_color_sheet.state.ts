import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

// Keyed by owner: two `AccountColorField`s can mount at once and a shared flag opens both.
interface AccountColorSheetStateShape {
  openOwner: string | undefined;
  stagedColor: string | undefined;
}

type AccountColorSheetState = AccountColorSheetStateShape & {
  open: (ownerId: string, currentColor: string) => void;
  stage: (color: string) => void;
  close: () => void;
  reset: () => void;
  isOpenFor: (ownerId: string) => boolean;
};

const INITIAL_STATE: AccountColorSheetStateShape = {
  openOwner: undefined,
  stagedColor: undefined,
};

export const useAccountColorSheetState = createMoneyAppSelectors(
  create<AccountColorSheetState>((set, get) => ({
    ...INITIAL_STATE,
    open: (ownerId, currentColor) => set({ openOwner: ownerId, stagedColor: currentColor }),
    stage: (color) => set({ stagedColor: color }),
    close: () => set(INITIAL_STATE),
    reset: () => set(INITIAL_STATE),
    isOpenFor: (ownerId) => get().openOwner === ownerId,
  })),
);
