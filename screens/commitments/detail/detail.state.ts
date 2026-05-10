import { create } from 'zustand';

import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';

export type DetailViewState = 'loading' | 'notFound' | 'ready';

// --- UI interaction state (skip confirmation dialog) ---

interface DetailStateShape {
  skipConfirmVisible: boolean;
}

interface CommitmentDetailState {
  state: DetailStateShape;
  setSkipConfirmVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: DetailStateShape = {
  skipConfirmVisible: false,
};

export const useCommitmentDetailState = create<CommitmentDetailState>((set) => ({
  state: INITIAL_STATE,
  setSkipConfirmVisible: (v) => set((s) => ({ state: { ...s.state, skipConfirmVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));

// --- Screen-level data state (async-loaded payments + view state) ---
// Relocated from detail.hook.ts to satisfy CLAUDE.md screens/ anatomy:
// Zustand stores belong in *.state.ts, never in *.hook.ts.

interface DetailScreenDataShape {
  allPayments: CommitmentPayment[];
  viewState: DetailViewState;
}

interface CommitmentDetailScreenDataStore {
  state: DetailScreenDataShape;
  setAllPayments: (payments: CommitmentPayment[]) => void;
  setViewState: (vs: DetailViewState) => void;
  reset: () => void;
}

const INITIAL_SCREEN_DATA: DetailScreenDataShape = {
  allPayments: [],
  viewState: 'loading',
};

export const useCommitmentDetailScreenData = create<CommitmentDetailScreenDataStore>((set) => ({
  state: INITIAL_SCREEN_DATA,
  setAllPayments: (payments) => set((s) => ({ state: { ...s.state, allPayments: payments } })),
  setViewState: (vs) => set((s) => ({ state: { ...s.state, viewState: vs } })),
  reset: () => set({ state: INITIAL_SCREEN_DATA }),
}));
