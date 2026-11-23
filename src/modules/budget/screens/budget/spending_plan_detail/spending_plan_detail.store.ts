import { create } from 'zustand';

import type { SpendingPlanWithCategories } from '@/modules/budget/entities/budget.entity';
import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface SpendingPlanDetailEntry {
  planId: string | undefined;
  plan: SpendingPlanWithCategories | undefined;
  spend: Record<string, number>;
  loadedOn: string | undefined;
}

type SpendingPlanDetailRead = Omit<SpendingPlanDetailEntry, 'planId' | 'loadedOn'> & {
  loadedOn: string;
};

type SpendingPlanDetailStoreShape = KeyedEntries<SpendingPlanDetailEntry>;

type SpendingPlanDetailStore = SpendingPlanDetailStoreShape & {
  setDetail: (owner: string, planId: string, detail: SpendingPlanDetailRead) => void;
  release: (owner: string) => void;
  reset: () => void;
};

// One shared object, so an unkeyed read is referentially stable across renders.
const EMPTY_SPEND: Record<string, number> = Object.freeze({});

export const INITIAL_DATA_ENTRY: SpendingPlanDetailEntry = Object.freeze({
  planId: undefined,
  plan: undefined,
  spend: EMPTY_SPEND,
  loadedOn: undefined,
});

const initialState = (): SpendingPlanDetailStoreShape => ({ entries: {} });

export const useSpendingPlanDetailStore = createMoneyAppSelectors(
  create<SpendingPlanDetailStore>((set) => ({
    ...initialState(),
    setDetail: (owner, planId, detail) =>
      set((state) => withEntry(state, owner, { ...detail, planId })),
    release: (owner) => set((state) => withoutEntry(state, owner)),
    reset: () => set(initialState()),
  })),
);
