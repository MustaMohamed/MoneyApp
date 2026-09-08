import { create } from 'zustand';

import type { AccountType } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type AccountsListTypeFilter = AccountType | 'all';

interface AccountsListStateShape {
  isRetrying: boolean;
  selectedType: AccountsListTypeFilter;
}

type AccountsListState = AccountsListStateShape & {
  setRetrying: (v: boolean) => void;
  setSelectedType: (t: AccountsListTypeFilter) => void;
  reset: () => void;
};

// No `persist`: the selection lives for the process, and a fresh launch opens on All.
const INITIAL_STATE: AccountsListStateShape = {
  isRetrying: false,
  selectedType: 'all',
};

export function createAccountsListState() {
  return createMoneyAppSelectors(
    create<AccountsListState>((set) => ({
      ...INITIAL_STATE,
      setRetrying: (v) => set({ isRetrying: v }),
      setSelectedType: (t) => set({ selectedType: t }),
      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useAccountsListState = createAccountsListState();
