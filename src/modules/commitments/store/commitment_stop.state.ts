import { create } from 'zustand';

import { type KeyedEntries, withEntry, withoutEntry } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CommitmentStopEntry {
  isOpen: boolean;
  busy: boolean;
  failed: boolean;
}

type CommitmentStopStateShape = KeyedEntries<CommitmentStopEntry>;

type CommitmentStopState = CommitmentStopStateShape & {
  open: (owner: string) => void;
  begin: (owner: string) => void;
  cancel: (owner: string) => void;
  fail: (owner: string) => void;
  succeed: (owner: string) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_STOP_ENTRY: CommitmentStopEntry = Object.freeze({
  isOpen: false,
  busy: false,
  failed: false,
});

export function isAnyCommitmentStopBusy(state: CommitmentStopStateShape): boolean {
  return Object.values(state.entries).some((entry) => entry.busy);
}

const initialState = (): CommitmentStopStateShape => ({ entries: {} });

// A released owner can still hold a callback; no write but the two begin actions opens an entry.
function updateEntry(
  state: CommitmentStopStateShape,
  owner: string,
  patch: Partial<CommitmentStopEntry>,
): CommitmentStopStateShape {
  if (!(owner in state.entries)) return state;
  return withEntry(state, owner, { ...state.entries[owner], ...patch });
}

export const useCommitmentStopState = createMoneyAppSelectors(
  create<CommitmentStopState>((set) => ({
    ...initialState(),
    open: (owner) =>
      set((state) =>
        state.entries[owner]?.busy === true
          ? state
          : withEntry(state, owner, { isOpen: true, busy: false, failed: false }),
      ),
    begin: (owner) =>
      set((state) =>
        withEntry(state, owner, {
          ...(state.entries[owner] ?? INITIAL_STOP_ENTRY),
          busy: true,
          failed: false,
        }),
      ),
    cancel: (owner) =>
      set((state) =>
        state.entries[owner]?.busy === true ? state : updateEntry(state, owner, { isOpen: false }),
      ),
    fail: (owner) => set((state) => updateEntry(state, owner, { busy: false, failed: true })),
    succeed: (owner) =>
      set((state) => updateEntry(state, owner, { isOpen: false, busy: false, failed: false })),
    release: (owner) => set((state) => withoutEntry(state, owner)),
    reset: () => set(initialState()),
  })),
);
