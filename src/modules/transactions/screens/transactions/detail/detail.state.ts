import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface TxDetailStateShape {
  confirmVisible: boolean;
  deleting: boolean;
  reloadKey: number;
}

type TxDetailState = TxDetailStateShape & {
  setConfirmVisible: (v: boolean) => void;
  setDeleting: (v: boolean) => void;
  bumpReload: () => void;
  reset: () => void;
};

const INITIAL_STATE: TxDetailStateShape = {
  confirmVisible: false,
  deleting: false,
  reloadKey: 0,
};

export const useTxDetailState = createMoneyAppSelectors(
  create<TxDetailState>((set) => ({
    ...INITIAL_STATE,
    setConfirmVisible: (v) => set({ confirmVisible: v }),
    setDeleting: (v) => set({ deleting: v }),
    bumpReload: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),
    reset: () => set(INITIAL_STATE),
  })),
);
