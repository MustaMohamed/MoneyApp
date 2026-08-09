import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

/**
 * The account form's guarded-save latch. Shape follows
 * createOnboardingTransitionState (busy/statusMessage -> saving/errorMessage),
 * with one field added: `inserted` is a session-scoped latch that survives a
 * failed onSaved() so a retry never inserts a second row — see
 * use_account_form.hook.ts.
 *
 * `errorMessage` must be an own key of INITIAL_STATE. createMoneyAppSelectors
 * builds `useState` from Object.keys(getState()) — omitting the key here
 * compiles and type-checks, then throws
 * "useAccountFormState.useState.errorMessage is not a function" on first
 * render of a live route.
 */
interface AccountFormStateShape {
  saving: boolean;
  /** This form session has already written a row. Never insert a second one. */
  inserted: boolean;
  /**
   * onSaved ran to completion (MA-008 D10). Terminal: submit() returns early
   * once this is true, because a completed session's host is already
   * navigating away and re-running onSaved a second time double-fires it
   * (two router.back() calls on Settings, a duplicate setStep+replace on
   * N2). A DECLINED onSaved (see declineSave) does not set this, so the
   * session stays retryable.
   */
  completed: boolean;
  errorMessage: string | undefined;
}

export type AccountFormState = AccountFormStateShape & {
  /** Synchronous re-entry guard. false when a save is already in flight. */
  beginSave: () => boolean;
  markInserted: () => void;
  failSave: (message: string) => void;
  /** onSaved completed. Latches `completed` — see the field's own comment. */
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
