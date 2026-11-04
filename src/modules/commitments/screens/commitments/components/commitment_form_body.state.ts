import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { EndsDraft, RepeatsDraft } from '../commitment_form.shared';

export type CommitmentChoiceSheetKind = 'repeats' | 'ends';

interface CommitmentFormBodyPickerEntry {
  categoryPickerVisible: boolean;
  choiceSheet: CommitmentChoiceSheetKind | undefined;
  repeatsDraft: RepeatsDraft | undefined;
  endsDraft: EndsDraft | undefined;
}

type CommitmentFormBodyStateShape = KeyedEntries<CommitmentFormBodyPickerEntry>;

type CommitmentFormBodyState = CommitmentFormBodyStateShape & {
  claim: (owner: string) => void;
  setCategoryPickerVisible: (owner: string, v: boolean) => void;
  closeChoiceSheet: (owner: string) => void;
  openEndsSheet: (owner: string, draft: EndsDraft) => void;
  setEndsDraft: (owner: string, draft: EndsDraft) => void;
  openRepeatsSheet: (owner: string, draft: RepeatsDraft) => void;
  setRepeatsDraft: (owner: string, draft: RepeatsDraft) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_PICKER_ENTRY: CommitmentFormBodyPickerEntry = Object.freeze({
  categoryPickerVisible: false,
  choiceSheet: undefined,
  repeatsDraft: undefined,
  endsDraft: undefined,
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
      // A close keeps both drafts, so the sheet's body holds through the close animation.
      closeChoiceSheet: (owner) => updateEntry(owner, { choiceSheet: undefined }),
      openEndsSheet: (owner, draft) =>
        updateEntry(owner, { choiceSheet: 'ends', endsDraft: draft }),
      setEndsDraft: (owner, draft) => updateEntry(owner, { endsDraft: draft }),
      openRepeatsSheet: (owner, draft) =>
        updateEntry(owner, { choiceSheet: 'repeats', repeatsDraft: draft }),
      setRepeatsDraft: (owner, draft) => updateEntry(owner, { repeatsDraft: draft }),
      release: (owner) => set((state) => withoutEntry(state, owner)),
      reset: () => set(initialState()),
    };
  }),
);
