import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type CommitmentDetailLoadStatus = 'loading' | 'ready' | 'firstLoadError';

interface CommitmentDetailUiEntry {
  activeId: string | undefined;
  status: CommitmentDetailLoadStatus;
  refreshError: boolean;
  reloadKey: number;
  skipConfirmVisible: boolean;
  skipBusy: boolean;
  skipError: boolean;
}

type DetailStateShape = KeyedEntries<CommitmentDetailUiEntry>;

type CommitmentDetailState = DetailStateShape & {
  beginLoad: (owner: string, commitmentId: string, preserveData: boolean) => void;
  resolve: (owner: string, commitmentId: string) => void;
  failLoad: (owner: string, commitmentId: string, preserveData: boolean) => void;
  bumpReload: (owner: string) => void;
  setSkipConfirmVisible: (owner: string, v: boolean) => void;
  setSkipBusy: (owner: string, v: boolean) => void;
  setSkipError: (owner: string, v: boolean) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_UI_ENTRY: CommitmentDetailUiEntry = Object.freeze({
  activeId: undefined,
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

// A settle for a commitment the copy no longer loads must not write over the current load.
function settleEntry(
  state: DetailStateShape,
  owner: string,
  commitmentId: string,
  patch: Partial<CommitmentDetailUiEntry>,
): DetailStateShape {
  if (state.entries[owner]?.activeId !== commitmentId) return state;
  return updateEntry(state, owner, () => patch);
}

export const useCommitmentDetailState = createMoneyAppSelectors(
  create<CommitmentDetailState>((set) => ({
    ...initialState(),
    // The begin action: a first mount has no entry yet, so this creates one and takes no guard.
    beginLoad: (owner, commitmentId, preserveData) =>
      set((state) =>
        withEntry(state, owner, {
          ...(state.entries[owner] ?? INITIAL_UI_ENTRY),
          activeId: commitmentId,
          status: preserveData ? 'ready' : 'loading',
          refreshError: false,
        }),
      ),
    resolve: (owner, commitmentId) =>
      set((state) =>
        settleEntry(state, owner, commitmentId, { status: 'ready', refreshError: false }),
      ),
    failLoad: (owner, commitmentId, preserveData) =>
      set((state) =>
        settleEntry(
          state,
          owner,
          commitmentId,
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
