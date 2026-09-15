import { create } from 'zustand';

import type { AccountType } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type AccountsListTypeFilter = AccountType | 'all';

export interface AccountsListUnarchiveError {
  id: string;
  message: string;
}

interface AccountsListStateShape {
  isRetrying: boolean;
  selectedType: AccountsListTypeFilter;
  isArchivedExpanded: boolean;
  unarchivingId: string | undefined;
  unarchiveError: AccountsListUnarchiveError | undefined;
}

type AccountsListState = AccountsListStateShape & {
  setRetrying: (v: boolean) => void;
  setSelectedType: (t: AccountsListTypeFilter) => void;
  setArchivedExpanded: (v: boolean) => void;
  setUnarchivingId: (id: string | undefined) => void;
  setUnarchiveError: (e: AccountsListUnarchiveError | undefined) => void;
  resetArchivedCard: () => void;
  reset: () => void;
};

// No `persist`: the selection lives for the process, and a fresh launch opens on All.
const INITIAL_STATE: AccountsListStateShape = {
  isRetrying: false,
  selectedType: 'all',
  isArchivedExpanded: false,
  unarchivingId: undefined,
  unarchiveError: undefined,
};

export function createAccountsListState() {
  return createMoneyAppSelectors(
    create<AccountsListState>((set) => ({
      ...INITIAL_STATE,
      setRetrying: (v) => set({ isRetrying: v }),
      setSelectedType: (t) => set({ selectedType: t }),
      setArchivedExpanded: (v) => set({ isArchivedExpanded: v }),
      setUnarchivingId: (id) => set({ unarchivingId: id }),
      setUnarchiveError: (e) => set({ unarchiveError: e }),
      // Per field: the selected type survives, and only `unarchive`'s own `finally` clears the lock.
      resetArchivedCard: () =>
        set({
          isArchivedExpanded: INITIAL_STATE.isArchivedExpanded,
          unarchiveError: INITIAL_STATE.unarchiveError,
        }),
      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useAccountsListState = createAccountsListState();
