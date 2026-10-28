import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface PaySheetEntry {
  visible: boolean;
  saving: boolean;
  /** This open's payment is written; Pay stays off until the next open. */
  settled: boolean;
  rateOverride: boolean;
  /** The banner copy to render; `undefined` means no failed save (mirrors edit_commitment). */
  saveError?: string;
  /** The local day the sheet opened on, the day a payment is dated by default. */
  openedOn?: string;
}

type PaySheetStateShape = KeyedEntries<PaySheetEntry>;

type PaySheetState = PaySheetStateShape & {
  open: (owner: string, openedOn?: string) => void;
  setVisible: (owner: string, v: boolean) => void;
  setSaving: (owner: string, v: boolean) => void;
  setSettled: (owner: string, v: boolean) => void;
  setRateOverride: (owner: string, v: boolean) => void;
  setSaveError: (owner: string, message?: string) => void;
  resetEntry: (owner: string) => void;
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
});

const initialState = (): PaySheetStateShape => ({ entries: {} });

export const usePaySheetState = createMoneyAppSelectors(
  create<PaySheetState>((set) => {
    // A released copy can still hold a callback, a save resolving late included; it must not write back.
    const updateEntry = (owner: string, patch: Partial<PaySheetEntry>) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        return withEntry(state, owner, { ...state.entries[owner], ...patch });
      });

    return {
      ...initialState(),
      // The begin action: a copy's first Mark as paid has no entry yet, so this takes no guard; each open starts clean.
      open: (owner, openedOn) =>
        set((state) =>
          withEntry(state, owner, { ...INITIAL_PAY_SHEET_ENTRY, visible: true, openedOn }),
        ),
      setVisible: (owner, v) => updateEntry(owner, { visible: v }),
      setSaving: (owner, v) => updateEntry(owner, { saving: v }),
      setSettled: (owner, v) => updateEntry(owner, { settled: v }),
      setRateOverride: (owner, v) => updateEntry(owner, { rateOverride: v }),
      setSaveError: (owner, message) => updateEntry(owner, { saveError: message }),
      resetEntry: (owner) => updateEntry(owner, INITIAL_PAY_SHEET_ENTRY),
      release: (owner) => set((state) => withoutEntry(state, owner)),
      reset: () => set(initialState()),
    };
  }),
);
