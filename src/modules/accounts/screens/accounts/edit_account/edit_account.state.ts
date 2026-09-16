import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditAccountUiEntry {
  saving: boolean;
  saveError?: string;
}

type EditAccountStateShape = KeyedEntries<EditAccountUiEntry>;

type EditAccountState = EditAccountStateShape & {
  claim: (owner: string) => void;
  setSaving: (owner: string, v: boolean) => void;
  setSaveError: (owner: string, message?: string) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_UI_ENTRY: EditAccountUiEntry = Object.freeze({
  saving: false,
  saveError: undefined,
});

const initialState = (): EditAccountStateShape => ({ entries: {} });

export const useEditAccountState = createMoneyAppSelectors(
  create<EditAccountState>((set) => {
    // A released copy can still hold a callback, a save resolving late included; it must not write back.
    const updateEntry = (owner: string, patch: Partial<EditAccountUiEntry>) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        return withEntry(state, owner, { ...state.entries[owner], ...patch });
      });

    return {
      ...initialState(),
      // The begin action, run on mount; `setSaving(false)` runs after an await, so no setter may open an entry.
      claim: (owner) =>
        set((state) =>
          owner in state.entries ? state : withEntry(state, owner, INITIAL_UI_ENTRY),
        ),
      setSaving: (owner, v) => updateEntry(owner, { saving: v }),
      setSaveError: (owner, message) => updateEntry(owner, { saveError: message }),
      release: (owner) => set((state) => withoutEntry(state, owner)),
      reset: () => set(initialState()),
    };
  }),
);
