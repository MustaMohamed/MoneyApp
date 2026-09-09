import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type TransactionDetailStatus =
  | 'idle'
  | 'initialLoading'
  | 'ready'
  | 'notFound'
  | 'firstLoadError';

export interface TxDetailUiEntry {
  activeId: string | undefined;
  status: TransactionDetailStatus;
  revalidating: boolean;
  refreshError: boolean;
  confirmVisible: boolean;
  deleting: boolean;
  reloadKey: number;
}

interface TxDetailStateShape {
  entries: Record<string, TxDetailUiEntry>;
}

type TxDetailState = TxDetailStateShape & {
  beginLoad: (owner: string, id: string, preserveData: boolean) => void;
  resolve: (owner: string, id: string) => void;
  resolveNotFound: (owner: string, id: string) => void;
  failLoad: (owner: string, id: string, preserveData: boolean) => void;
  setConfirmVisible: (owner: string, v: boolean) => void;
  setDeleting: (owner: string, v: boolean) => void;
  bumpReload: (owner: string) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_UI_ENTRY: TxDetailUiEntry = Object.freeze({
  activeId: undefined,
  status: 'idle',
  revalidating: false,
  refreshError: false,
  confirmVisible: false,
  deleting: false,
  reloadKey: 0,
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
      set((state) =>
        withEntry(state, owner, {
          ...(state.entries[owner] ?? INITIAL_UI_ENTRY),
          activeId,
          status: preserveData ? 'ready' : 'initialLoading',
          revalidating: preserveData,
          refreshError: false,
        }),
      ),
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
    setConfirmVisible: (owner, v) =>
      set((state) =>
        withEntry(state, owner, {
          ...(state.entries[owner] ?? INITIAL_UI_ENTRY),
          confirmVisible: v,
        }),
      ),
    setDeleting: (owner, v) =>
      set((state) =>
        withEntry(state, owner, { ...(state.entries[owner] ?? INITIAL_UI_ENTRY), deleting: v }),
      ),
    bumpReload: (owner) =>
      set((state) => {
        const entry = state.entries[owner] ?? INITIAL_UI_ENTRY;
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
