import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type CommitmentDetailLoadStatus = 'loading' | 'ready' | 'firstLoadError';

interface CommitmentDetailUiEntry {
  status: CommitmentDetailLoadStatus;
  refreshError: boolean;
  reloadKey: number;
  skipConfirmVisible: boolean;
  skipBusy: boolean;
  skipError: boolean;
}

type DetailStateShape = KeyedEntries<CommitmentDetailUiEntry>;

type CommitmentDetailState = DetailStateShape & {
  beginLoad: (owner: string, preserveData: boolean) => void;
  resolve: (owner: string) => void;
  failLoad: (owner: string, preserveData: boolean) => void;
  bumpReload: (owner: string) => void;
  setSkipConfirmVisible: (owner: string, v: boolean) => void;
  setSkipBusy: (owner: string, v: boolean) => void;
  setSkipError: (owner: string, v: boolean) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_UI_ENTRY: CommitmentDetailUiEntry = Object.freeze({
  status: 'loading',
  refreshError: false,
  reloadKey: 0,
  skipConfirmVisible: false,
  skipBusy: false,
  skipError: false,
});

const initialState = (): DetailStateShape => ({ entries: {} });

// A released copy can still hold a callback; every write but the begin action must not write its entry back.
function updateEntry(
  state: DetailStateShape,
  owner: string,
  patch: (entry: CommitmentDetailUiEntry) => Partial<CommitmentDetailUiEntry>,
): DetailStateShape {
  if (!(owner in state.entries)) return state;
  const entry = state.entries[owner];
  return withEntry(state, owner, { ...entry, ...patch(entry) });
}

export const useCommitmentDetailState = createMoneyAppSelectors(
  create<CommitmentDetailState>((set) => ({
    ...initialState(),
    // The begin action: a first mount has no entry yet, so this creates one and takes no guard.
    beginLoad: (owner, preserveData) =>
      set((state) =>
        withEntry(state, owner, {
          ...(state.entries[owner] ?? INITIAL_UI_ENTRY),
          status: preserveData ? 'ready' : 'loading',
          refreshError: false,
        }),
      ),
    resolve: (owner) =>
      set((state) => updateEntry(state, owner, () => ({ status: 'ready', refreshError: false }))),
    failLoad: (owner, preserveData) =>
      set((state) =>
        updateEntry(state, owner, () =>
          preserveData ? { refreshError: true } : { status: 'firstLoadError' },
        ),
      ),
    bumpReload: (owner) =>
      set((state) => updateEntry(state, owner, (entry) => ({ reloadKey: entry.reloadKey + 1 }))),
    setSkipConfirmVisible: (owner, v) =>
      set((state) => updateEntry(state, owner, () => ({ skipConfirmVisible: v }))),
    setSkipBusy: (owner, v) => set((state) => updateEntry(state, owner, () => ({ skipBusy: v }))),
    setSkipError: (owner, v) => set((state) => updateEntry(state, owner, () => ({ skipError: v }))),
    release: (owner) => set((state) => withoutEntry(state, owner)),
    reset: () => set(initialState()),
  })),
);
