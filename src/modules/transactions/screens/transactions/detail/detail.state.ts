import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type TransactionDetailStatus =
  | 'idle'
  | 'initialLoading'
  | 'ready'
  | 'notFound'
  | 'firstLoadError';

interface TxDetailStateShape {
  activeId: string | undefined;
  status: TransactionDetailStatus;
  revalidating: boolean;
  refreshError: boolean;
  confirmVisible: boolean;
  deleting: boolean;
  reloadKey: number;
}

type TxDetailState = TxDetailStateShape & {
  beginLoad: (id: string, preserveData: boolean) => void;
  resolve: (id: string) => void;
  resolveNotFound: (id: string) => void;
  failLoad: (id: string, preserveData: boolean) => void;
  setConfirmVisible: (v: boolean) => void;
  setDeleting: (v: boolean) => void;
  bumpReload: () => void;
  reset: () => void;
};

const INITIAL_STATE: TxDetailStateShape = {
  activeId: undefined,
  status: 'idle',
  revalidating: false,
  refreshError: false,
  confirmVisible: false,
  deleting: false,
  reloadKey: 0,
};

export const useTxDetailState = createMoneyAppSelectors(
  create<TxDetailState>((set) => ({
    ...INITIAL_STATE,
    beginLoad: (activeId, preserveData) =>
      set({
        activeId,
        status: preserveData ? 'ready' : 'initialLoading',
        revalidating: preserveData,
        refreshError: false,
      }),
    resolve: (id) =>
      set((state) =>
        state.activeId === id
          ? { status: 'ready', revalidating: false, refreshError: false }
          : state,
      ),
    resolveNotFound: (id) =>
      set((state) =>
        state.activeId === id
          ? { status: 'notFound', revalidating: false, refreshError: false }
          : state,
      ),
    failLoad: (id, preserveData) =>
      set((state) => {
        if (state.activeId !== id) return state;
        return preserveData
          ? { status: 'ready', revalidating: false, refreshError: true }
          : { status: 'firstLoadError', revalidating: false, refreshError: false };
      }),
    setConfirmVisible: (v) => set({ confirmVisible: v }),
    setDeleting: (v) => set({ deleting: v }),
    bumpReload: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),
    reset: () => set(INITIAL_STATE),
  })),
);
