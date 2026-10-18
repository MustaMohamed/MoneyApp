import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type TransactionDetailStatus =
  | 'idle'
  | 'initialLoading'
  | 'ready'
  | 'notFound'
  | 'firstLoadError';

interface TxDetailUiEntry {
  activeId: string | undefined;
  status: TransactionDetailStatus;
  revalidating: boolean;
  refreshError: boolean;
  reloadKey: number;
  accountLookupSettled: boolean;
}

interface TxDetailStateShape {
  entries: Record<string, TxDetailUiEntry>;
}

type TxDetailState = TxDetailStateShape & {
  beginLoad: (owner: string, id: string, preserveData: boolean) => void;
  resolve: (owner: string, id: string) => void;
  resolveNotFound: (owner: string, id: string) => void;
  failLoad: (owner: string, id: string, preserveData: boolean) => void;
  settleAccountLookup: (owner: string, id: string) => void;
  bumpReload: (owner: string) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_UI_ENTRY: TxDetailUiEntry = Object.freeze({
  activeId: undefined,
  status: 'idle',
  revalidating: false,
  refreshError: false,
  reloadKey: 0,
  accountLookupSettled: false,
});

const initialState = (): TxDetailStateShape => ({ entries: {} });

const withEntry = (
  state: TxDetailStateShape,
  owner: string,
  entry: TxDetailUiEntry,
): TxDetailStateShape => ({ entries: { ...state.entries, [owner]: entry } });

export const useTxDetailState = createMoneyAppSelectors(
  create<TxDetailState>((set) => ({
    ...initialState(),
    beginLoad: (owner, activeId, preserveData) =>
      set((state) => {
        const entry = state.entries[owner] ?? INITIAL_UI_ENTRY;
        return withEntry(state, owner, {
          ...entry,
          activeId,
          status: preserveData ? 'ready' : 'initialLoading',
          revalidating: preserveData,
          refreshError: false,
          // A refresh keeps drawn flow cells; a fresh load waits on its own lookup.
          accountLookupSettled: preserveData && entry.accountLookupSettled,
        });
      }),
    resolve: (owner, id) =>
      set((state) => {
        const entry = state.entries[owner] ?? INITIAL_UI_ENTRY;
        if (entry.activeId !== id) return state;
        return withEntry(state, owner, {
          ...entry,
          status: 'ready',
          revalidating: false,
          refreshError: false,
        });
      }),
    resolveNotFound: (owner, id) =>
      set((state) => {
        const entry = state.entries[owner] ?? INITIAL_UI_ENTRY;
        if (entry.activeId !== id) return state;
        return withEntry(state, owner, {
          ...entry,
          status: 'notFound',
          revalidating: false,
          refreshError: false,
        });
      }),
    failLoad: (owner, id, preserveData) =>
      set((state) => {
        const entry = state.entries[owner] ?? INITIAL_UI_ENTRY;
        if (entry.activeId !== id) return state;
        return withEntry(
          state,
          owner,
          preserveData
            ? { ...entry, status: 'ready', revalidating: false, refreshError: true }
            : { ...entry, status: 'firstLoadError', revalidating: false, refreshError: false },
        );
      }),
    settleAccountLookup: (owner, id) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        const entry = state.entries[owner];
        if (entry.activeId !== id) return state;
        return withEntry(state, owner, { ...entry, accountLookupSettled: true });
      }),
    // A released copy can still hold a callback; this must not write its entry back.
    bumpReload: (owner) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        const entry = state.entries[owner];
        return withEntry(state, owner, { ...entry, reloadKey: entry.reloadKey + 1 });
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
