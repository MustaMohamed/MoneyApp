import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type PaySheetPostCloseAction = 'addAccount';

interface PaySheetEntry {
  visible: boolean;
  saving: boolean;
  /** This open's payment is written; Pay stays off until the next open. */
  settled: boolean;
  rateOverride: boolean;
  /** The status track's line for a failed save; `undefined` means no failed save (mirrors edit_commitment). */
  saveError?: string;
  /** The local day the sheet opened on, the day a payment is dated by default. */
  openedOn?: string;
  /** What a settled close carries out: the no-accounts state's Add account opens add account. */
  postCloseAction: PaySheetPostCloseAction | undefined;
}

type PaySheetStateShape = KeyedEntries<PaySheetEntry>;

type PaySheetState = PaySheetStateShape & {
  open: (owner: string, openedOn?: string) => void;
  setVisible: (owner: string, v: boolean) => void;
  setSaving: (owner: string, v: boolean) => void;
  setSettled: (owner: string, v: boolean) => void;
  setRateOverride: (owner: string, v: boolean) => void;
  setSaveError: (owner: string, message?: string) => void;
  /** Hides a visible, idle sheet for the add-account hand-off; `false` when it changed nothing. */
  requestAccountCreation: (owner: string) => boolean;
  /** Reads and clears the hand-off a settled close owes. */
  completeClose: (owner: string) => PaySheetPostCloseAction | undefined;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_PAY_SHEET_ENTRY: PaySheetEntry = Object.freeze({
  visible: false,
  saving: false,
  settled: false,
  rateOverride: false,
  saveError: undefined,
  openedOn: undefined,
  postCloseAction: undefined,
});

const initialState = (): PaySheetStateShape => ({ entries: {} });

export const usePaySheetState = createMoneyAppSelectors(
  create<PaySheetState>((set, get) => {
    // A released copy can still hold a callback, a save resolving late included; it must not write back.
    const updateEntry = (owner: string, patch: Partial<PaySheetEntry>) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        return withEntry(state, owner, { ...state.entries[owner], ...patch });
      });

    return {
      ...initialState(),
      // The begin action: no guard, since a copy's first Mark as paid has no entry; a save in flight survives a reopen.
      open: (owner, openedOn) =>
        set((state) =>
          withEntry(state, owner, {
            ...INITIAL_PAY_SHEET_ENTRY,
            visible: true,
            saving: owner in state.entries && state.entries[owner].saving,
            openedOn,
          }),
        ),
      setVisible: (owner, v) => updateEntry(owner, { visible: v }),
      setSaving: (owner, v) => updateEntry(owner, { saving: v }),
      setSettled: (owner, v) => updateEntry(owner, { settled: v }),
      setRateOverride: (owner, v) => updateEntry(owner, { rateOverride: v }),
      setSaveError: (owner, message) => updateEntry(owner, { saveError: message }),
      requestAccountCreation: (owner) => {
        const { entries } = get();
        if (!(owner in entries) || !entries[owner].visible || entries[owner].saving) return false;
        updateEntry(owner, { visible: false, postCloseAction: 'addAccount' });
        return true;
      },
      completeClose: (owner) => {
        const { entries } = get();
        if (!(owner in entries)) return undefined;
        const action = entries[owner].postCloseAction;
        if (action !== undefined) updateEntry(owner, { postCloseAction: undefined });
        return action;
      },
      release: (owner) => set((state) => withoutEntry(state, owner)),
      reset: () => set(initialState()),
    };
  }),
);
