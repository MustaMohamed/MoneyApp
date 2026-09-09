import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type DetailViewState = 'loading' | 'notFound' | 'ready';

interface CommitmentDetailUiEntry {
  viewState: DetailViewState;
  skipConfirmVisible: boolean;
}

type DetailStateShape = KeyedEntries<CommitmentDetailUiEntry>;

type CommitmentDetailState = DetailStateShape & {
  setViewState: (owner: string, vs: DetailViewState) => void;
  setSkipConfirmVisible: (owner: string, v: boolean) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_UI_ENTRY: CommitmentDetailUiEntry = Object.freeze({
  viewState: 'loading',
  skipConfirmVisible: false,
});

const initialState = (): DetailStateShape => ({ entries: {} });

export const useCommitmentDetailState = createMoneyAppSelectors(
  create<CommitmentDetailState>((set) => ({
    ...initialState(),
    // The begin action: a first mount has no entry yet, so this creates one and takes no guard.
    setViewState: (owner, vs) =>
      set((state) =>
        withEntry(state, owner, { ...(state.entries[owner] ?? INITIAL_UI_ENTRY), viewState: vs }),
      ),
    // A released copy can still hold a callback; this must not write its entry back.
    setSkipConfirmVisible: (owner, v) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        return withEntry(state, owner, { ...state.entries[owner], skipConfirmVisible: v });
      }),
    release: (owner) => set((state) => withoutEntry(state, owner)),
    reset: () => set(initialState()),
  })),
);
