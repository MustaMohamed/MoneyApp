import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { CommitmentPayment } from '../../../entities/commitment_payment.entity';

export type DetailViewState = 'loading' | 'notFound' | 'ready';

// --- UI interaction state (skip confirmation dialog) ---

interface DetailStateShape {
  skipConfirmVisible: boolean;
}

type CommitmentDetailState = DetailStateShape & {
  setSkipConfirmVisible: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: DetailStateShape = {
  skipConfirmVisible: false,
};

export const useCommitmentDetailState = createMoneyAppSelectors(
  create<CommitmentDetailState>((set) => ({
    ...INITIAL_STATE,
    setSkipConfirmVisible: (v) => set((s) => ({ ...s, skipConfirmVisible: v })),
    reset: () => set(INITIAL_STATE),
  })),
);

// --- Screen-level data state (async-loaded payments + view state) ---
// Relocated from detail.hook.ts to satisfy CLAUDE.md screens/ anatomy:
// Zustand stores belong in *.state.ts, never in *.hook.ts.

interface DetailScreenDataShape {
  allPayments: CommitmentPayment[];
  viewState: DetailViewState;
}

type CommitmentDetailScreenDataStore = DetailScreenDataShape & {
  setAllPayments: (payments: CommitmentPayment[]) => void;
  setViewState: (vs: DetailViewState) => void;
  reset: () => void;
};

const INITIAL_SCREEN_DATA: DetailScreenDataShape = {
  allPayments: [],
  viewState: 'loading',
};

export const useCommitmentDetailScreenData = createMoneyAppSelectors(
  create<CommitmentDetailScreenDataStore>((set) => ({
    ...INITIAL_SCREEN_DATA,
    setAllPayments: (payments) => set((s) => ({ ...s, allPayments: payments })),
    setViewState: (vs) => set((s) => ({ ...s, viewState: vs })),
    reset: () => set(INITIAL_SCREEN_DATA),
  })),
);
