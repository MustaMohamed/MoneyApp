import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CommitmentFormBodyPickerEntry {
  categoryPickerVisible: boolean;
  accountPickerVisible: boolean;
  showStartDatePicker: boolean;
  showEndDatePicker: boolean;
}

type CommitmentFormBodyStateShape = KeyedEntries<CommitmentFormBodyPickerEntry>;

type CommitmentFormBodyState = CommitmentFormBodyStateShape & {
  claim: (owner: string) => void;
  setCategoryPickerVisible: (owner: string, v: boolean) => void;
  setAccountPickerVisible: (owner: string, v: boolean) => void;
  setShowStartDatePicker: (owner: string, v: boolean) => void;
  setShowEndDatePicker: (owner: string, v: boolean) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_PICKER_ENTRY: CommitmentFormBodyPickerEntry = Object.freeze({
  categoryPickerVisible: false,
  accountPickerVisible: false,
  showStartDatePicker: false,
  showEndDatePicker: false,
});

const initialState = (): CommitmentFormBodyStateShape => ({ entries: {} });

export const useCommitmentFormBodyState = createMoneyAppSelectors(
  create<CommitmentFormBodyState>((set) => {
    // A released copy can still hold a picker callback; it must not write its entry back.
    const updateEntry = (owner: string, patch: Partial<CommitmentFormBodyPickerEntry>) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        return withEntry(state, owner, { ...state.entries[owner], ...patch });
      });

    return {
      ...initialState(),
      // The begin action, run on mount; no setter opens an entry.
      claim: (owner) =>
        set((state) =>
          owner in state.entries ? state : withEntry(state, owner, INITIAL_PICKER_ENTRY),
        ),
      setCategoryPickerVisible: (owner, v) => updateEntry(owner, { categoryPickerVisible: v }),
      setAccountPickerVisible: (owner, v) => updateEntry(owner, { accountPickerVisible: v }),
      setShowStartDatePicker: (owner, v) => updateEntry(owner, { showStartDatePicker: v }),
      setShowEndDatePicker: (owner, v) => updateEntry(owner, { showEndDatePicker: v }),
      release: (owner) => set((state) => withoutEntry(state, owner)),
      reset: () => set(initialState()),
    };
  }),
);
