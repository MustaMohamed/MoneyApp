import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AccountsListStateShape {
  isRetrying: boolean;
}

type AccountsListState = AccountsListStateShape & {
  setRetrying: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: AccountsListStateShape = {
  isRetrying: false,
};

export function createAccountsListState() {
  return createMoneyAppSelectors(
    create<AccountsListState>((set) => ({
      ...INITIAL_STATE,
      setRetrying: (v) => set({ isRetrying: v }),
      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useAccountsListState = createAccountsListState();
