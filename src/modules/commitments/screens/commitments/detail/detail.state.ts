import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type DetailViewState = 'loading' | 'notFound' | 'ready';

interface CommitmentDetailUiEntry {
  viewState: DetailViewState;
  skipConfirmVisible: boolean;
}

interface DetailStateShape {
  entries: Record<string, CommitmentDetailUiEntry>;
}

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

const withEntry = (
  state: DetailStateShape,
  owner: string,
  entry: CommitmentDetailUiEntry,
): DetailStateShape => ({ entries: { ...state.entries, [owner]: entry } });

export const useCommitmentDetailState = createMoneyAppSelectors(
  create<CommitmentDetailState>((set) => ({
    ...initialState(),
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
    release: (owner) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        const entries = { ...state.entries };
        delete entries[owner];
        return { entries };
      }),
    reset: () => set(initialState()),
  })),
);
