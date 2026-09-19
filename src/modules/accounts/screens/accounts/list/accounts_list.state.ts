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
  /** The order on screen while a reorder write is in flight, until the store reloads. */
  pendingOrder: string[] | undefined;
  isReordering: boolean;
  /** The row a long-press on its grip has lifted, until the gesture ends. */
  liftedId: string | undefined;
}

type AccountsListState = AccountsListStateShape & {
  setRetrying: (v: boolean) => void;
  setSelectedType: (t: AccountsListTypeFilter) => void;
  setArchivedExpanded: (v: boolean) => void;
  setUnarchivingId: (id: string | undefined) => void;
  setUnarchiveError: (e: AccountsListUnarchiveError | undefined) => void;
  setPendingOrder: (order: string[] | undefined) => void;
  setReordering: (v: boolean) => void;
  setLiftedId: (id: string | undefined) => void;
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
  pendingOrder: undefined,
  isReordering: false,
  liftedId: undefined,
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
      setPendingOrder: (order) => set({ pendingOrder: order }),
      setReordering: (v) => set({ isReordering: v }),
      setLiftedId: (id) => set({ liftedId: id }),
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
