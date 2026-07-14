import { create } from 'zustand';

import type { SpendingPlanWithCategories } from '@/modules/budget/entities/budget.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface SpendingPlanDetailStoreShape {
  plan: SpendingPlanWithCategories | undefined;
  spend: Record<string, number>;
}

type SpendingPlanDetailStore = SpendingPlanDetailStoreShape & {
  setData: (plan: SpendingPlanWithCategories, spend: Record<string, number>) => void;
  reset: () => void;
};

const INITIAL_STATE: SpendingPlanDetailStoreShape = { plan: undefined, spend: {} };

export const useSpendingPlanDetailStore = createMoneyAppSelectors(
  create<SpendingPlanDetailStore>((set) => ({
    ...INITIAL_STATE,
    setData: (plan, spend) => set({ plan, spend }),
    reset: () => set(INITIAL_STATE),
  })),
);
