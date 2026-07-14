import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type SpendingPlanDetailViewState = 'loading' | 'ready' | 'notFound' | 'error';

interface SpendingPlanDetailStateShape {
  viewState: SpendingPlanDetailViewState;
  errorMessage: string | undefined;
}

type SpendingPlanDetailState = SpendingPlanDetailStateShape & {
  beginLoad: () => void;
  finishLoad: (viewState: Exclude<SpendingPlanDetailViewState, 'loading'>) => void;
  failLoad: (message: string) => void;
  reset: () => void;
};

const INITIAL_STATE: SpendingPlanDetailStateShape = {
  viewState: 'loading',
  errorMessage: undefined,
};

export const useSpendingPlanDetailState = createMoneyAppSelectors(
  create<SpendingPlanDetailState>((set) => ({
    ...INITIAL_STATE,
    beginLoad: () => set(INITIAL_STATE),
    finishLoad: (viewState) => set({ viewState, errorMessage: undefined }),
    failLoad: (errorMessage) => set({ viewState: 'error', errorMessage }),
    reset: () => set(INITIAL_STATE),
  })),
);
