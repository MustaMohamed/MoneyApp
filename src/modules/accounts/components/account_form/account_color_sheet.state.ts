import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

/**
 * Staged-colour state for the 32-colour sheet (MA-006). Shape follows
 * adjust_balance_sheet.state.ts (the same stage-then-confirm problem), with
 * one addition: the slot is keyed by owner. Two AccountColorFields can be
 * mounted at once (the Accounts stack keeps a pushed route's parent alive,
 * and MA-007/MA-008 add more consumers), and a shared `isOpen` boolean would
 * open both portals — .claude/rules/state.md rule 5, audit L27.
 *
 * Seeding happens in `open`, not a useEffect: the confirm handler writes RHF
 * while the sheet is still open for a frame, and an effect keyed off the
 * seed value would make a later change silently re-seed. An action removes
 * the question.
 */
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
