import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type CommitmentChoiceSheetKind = 'repeats' | 'ends';

interface CommitmentFormBodyPickerEntry {
  categoryPickerVisible: boolean;
  showEndDatePicker: boolean;
  choiceSheet: CommitmentChoiceSheetKind | undefined;
}

type CommitmentFormBodyStateShape = KeyedEntries<CommitmentFormBodyPickerEntry>;

type CommitmentFormBodyState = CommitmentFormBodyStateShape & {
  claim: (owner: string) => void;
  setCategoryPickerVisible: (owner: string, v: boolean) => void;
  setShowEndDatePicker: (owner: string, v: boolean) => void;
  setChoiceSheet: (owner: string, sheet: CommitmentChoiceSheetKind | undefined) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_PICKER_ENTRY: CommitmentFormBodyPickerEntry = Object.freeze({
  categoryPickerVisible: false,
  showEndDatePicker: false,
  choiceSheet: undefined,
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
      setShowEndDatePicker: (owner, v) => updateEntry(owner, { showEndDatePicker: v }),
      setChoiceSheet: (owner, sheet) => updateEntry(owner, { choiceSheet: sheet }),
      release: (owner) => set((state) => withoutEntry(state, owner)),
      reset: () => set(initialState()),
    };
  }),
);
