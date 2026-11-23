import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type SpendingPlanDetailLoadStatus = 'loading' | 'ready' | 'firstLoadError';

interface SpendingPlanDetailUiEntry {
  activeId: string | undefined;
  status: SpendingPlanDetailLoadStatus;
  refreshError: boolean;
}

type SpendingPlanDetailStateShape = KeyedEntries<SpendingPlanDetailUiEntry>;

type SpendingPlanDetailState = SpendingPlanDetailStateShape & {
  beginLoad: (owner: string, planId: string, preserveData: boolean) => void;
  resolve: (owner: string, planId: string) => void;
  failLoad: (owner: string, planId: string, preserveData: boolean) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_UI_ENTRY: SpendingPlanDetailUiEntry = Object.freeze({
  activeId: undefined,
  status: 'loading',
  refreshError: false,
});

const initialState = (): SpendingPlanDetailStateShape => ({ entries: {} });

// A settle for a plan the copy no longer loads, or for a released copy, must not write.
function settleEntry(
  state: SpendingPlanDetailStateShape,
  owner: string,
  planId: string,
  patch: Partial<SpendingPlanDetailUiEntry>,
): SpendingPlanDetailStateShape {
  if (!(owner in state.entries)) return state;
  const entry = state.entries[owner];
  if (entry.activeId !== planId) return state;
  return withEntry(state, owner, { ...entry, ...patch });
}

export const useSpendingPlanDetailState = createMoneyAppSelectors(
  create<SpendingPlanDetailState>((set) => ({
    ...initialState(),
    beginLoad: (owner, planId, preserveData) =>
      set((state) =>
        withEntry(state, owner, {
          activeId: planId,
          status: preserveData ? 'ready' : 'loading',
          refreshError: false,
        }),
      ),
    resolve: (owner, planId) =>
      set((state) => settleEntry(state, owner, planId, { status: 'ready', refreshError: false })),
    failLoad: (owner, planId, preserveData) =>
      set((state) =>
        settleEntry(
          state,
          owner,
          planId,
          preserveData ? { refreshError: true } : { status: 'firstLoadError' },
        ),
      ),
    release: (owner) => set((state) => withoutEntry(state, owner)),
    reset: () => set(initialState()),
  })),
);
