import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

// Fields must be own keys of `INITIAL_STATE`; selectors come from `Object.keys(getState())`.
interface AccountFormStateShape {
  saving: boolean;
  /** This form session has already written a row. Never insert a second one. */
  inserted: boolean;
  /** Terminal; `submit()` returns early so `onSaved` never double-fires navigation. */
  completed: boolean;
  errorMessage: string | undefined;
}

export type AccountFormState = AccountFormStateShape & {
  /** Synchronous re-entry guard. false when a save is already in flight. */
  beginSave: () => boolean;
  markInserted: () => void;
  failSave: (message: string) => void;
  finishSave: () => void;
  /** onSaved declined (returned false). Session stays retryable. */
  declineSave: () => void;
  reset: () => void;
};

const INITIAL_STATE: AccountFormStateShape = {
  saving: false,
  inserted: false,
  completed: false,
  errorMessage: undefined,
};

export function createAccountFormState() {
  return createMoneyAppSelectors(
    create<AccountFormState>((set, get) => ({
      ...INITIAL_STATE,

      beginSave: () => {
        if (get().saving) return false;
        set({ saving: true, errorMessage: undefined });
        return true;
      },

      markInserted: () => set({ inserted: true }),

      failSave: (message) => set({ saving: false, errorMessage: message }),

      finishSave: () => set({ saving: false, completed: true }),

      declineSave: () => set({ saving: false }),

      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useAccountFormState = createAccountFormState();
