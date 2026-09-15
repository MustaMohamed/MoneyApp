import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditCommitmentUiEntry {
  saving: boolean;
  saveError?: string;
  deactivateDialogVisible: boolean;
}

type EditCommitmentStateShape = KeyedEntries<EditCommitmentUiEntry>;

type EditCommitmentState = EditCommitmentStateShape & {
  claim: (owner: string) => void;
  setSaving: (owner: string, v: boolean) => void;
  setSaveError: (owner: string, message?: string) => void;
  setDeactivateDialogVisible: (owner: string, v: boolean) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_UI_ENTRY: EditCommitmentUiEntry = Object.freeze({
  saving: false,
  saveError: undefined,
  deactivateDialogVisible: false,
});

const initialState = (): EditCommitmentStateShape => ({ entries: {} });

export const useEditCommitmentState = createMoneyAppSelectors(
  create<EditCommitmentState>((set) => {
    // A released copy can still hold a callback, a save resolving late included; it must not write back.
    const updateEntry = (owner: string, patch: Partial<EditCommitmentUiEntry>) =>
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
      setDeactivateDialogVisible: (owner, v) => updateEntry(owner, { deactivateDialogVisible: v }),
      release: (owner) => set((state) => withoutEntry(state, owner)),
      reset: () => set(initialState()),
    };
  }),
);
