import { create } from 'zustand';

interface TxDetailStateShape {
  confirmVisible: boolean;
  deleting: boolean;
  reloadKey: number;
}

interface TxDetailState {
  state: TxDetailStateShape;
  setConfirmVisible: (v: boolean) => void;
  setDeleting: (v: boolean) => void;
  bumpReload: () => void;
  reset: () => void;
}

const INITIAL_STATE: TxDetailStateShape = {
  confirmVisible: false,
  deleting: false,
  reloadKey: 0,
};

export const useTxDetailState = create<TxDetailState>((set) => ({
  state: INITIAL_STATE,
  setConfirmVisible: (v) => set((s) => ({ state: { ...s.state, confirmVisible: v } })),
  setDeleting: (v) => set((s) => ({ state: { ...s.state, deleting: v } })),
  bumpReload: () => set((s) => ({ state: { ...s.state, reloadKey: s.state.reloadKey + 1 } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
