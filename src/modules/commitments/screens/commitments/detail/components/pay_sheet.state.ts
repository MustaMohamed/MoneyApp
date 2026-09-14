import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface PaySheetEntry {
  visible: boolean;
  saving: boolean;
  accountPickerVisible: boolean;
  rateOverride: boolean;
  /** The banner copy to render; `undefined` means no failed save (mirrors edit_commitment). */
  saveError?: string;
}

type PaySheetStateShape = KeyedEntries<PaySheetEntry>;

type PaySheetState = PaySheetStateShape & {
  open: (owner: string) => void;
  setVisible: (owner: string, v: boolean) => void;
  setSaving: (owner: string, v: boolean) => void;
  setAccountPickerVisible: (owner: string, v: boolean) => void;
  setRateOverride: (owner: string, v: boolean) => void;
  setSaveError: (owner: string, message?: string) => void;
  resetEntry: (owner: string) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_PAY_SHEET_ENTRY: PaySheetEntry = Object.freeze({
  visible: false,
  saving: false,
  accountPickerVisible: false,
  rateOverride: false,
  saveError: undefined,
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
      // The begin action: a copy's first Mark as paid has no entry yet, so this takes no guard.
      open: (owner) =>
        set((state) =>
          withEntry(state, owner, {
            ...(state.entries[owner] ?? INITIAL_PAY_SHEET_ENTRY),
            visible: true,
          }),
        ),
      setVisible: (owner, v) => updateEntry(owner, { visible: v }),
      setSaving: (owner, v) => updateEntry(owner, { saving: v }),
      setAccountPickerVisible: (owner, v) => updateEntry(owner, { accountPickerVisible: v }),
      setRateOverride: (owner, v) => updateEntry(owner, { rateOverride: v }),
      setSaveError: (owner, message) => updateEntry(owner, { saveError: message }),
      resetEntry: (owner) => updateEntry(owner, INITIAL_PAY_SHEET_ENTRY),
      release: (owner) => set((state) => withoutEntry(state, owner)),
      reset: () => set(initialState()),
    };
  }),
);
