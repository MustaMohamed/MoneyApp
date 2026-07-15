import { create } from 'zustand';

import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CategoryDetailStateShape {
  month: string;
}

type CategoryDetailState = CategoryDetailStateShape & {
  setMonth: (month: string) => void;
  reset: () => void;
};

function initialState(): CategoryDetailStateShape {
  return { month: currentYearMonth() };
}

export const useCategoryDetailState = createMoneyAppSelectors(
  create<CategoryDetailState>((set) => ({
    ...initialState(),
    setMonth: (month) => set({ month }),
    reset: () => set(initialState()),
  })),
);
