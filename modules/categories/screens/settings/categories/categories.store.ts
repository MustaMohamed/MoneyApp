import { create } from 'zustand';

import type { Category } from '@/modules/categories/store/category.store';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CategoriesScreenStoreShape {
  editingCategory: Category | null;
  categoryToDelete: Category | null;
  linkedCount: number;
}

interface CategoriesScreenStore {
  state: CategoriesScreenStoreShape;
  setEditingCategory: (c: Category | null) => void;
  setCategoryToDelete: (c: Category | null) => void;
  setLinkedCount: (count: number) => void;
  reset: () => void;
}

const INITIAL_STATE: CategoriesScreenStoreShape = {
  editingCategory: null,
  categoryToDelete: null,
  linkedCount: 0,
};

export const useCategoriesScreenStore = createMoneyAppSelectors(
  create<CategoriesScreenStore>((set) => ({
    state: INITIAL_STATE,
    setEditingCategory: (c) => set((s) => ({ state: { ...s.state, editingCategory: c } })),
    setCategoryToDelete: (c) => set((s) => ({ state: { ...s.state, categoryToDelete: c } })),
    setLinkedCount: (count) => set((s) => ({ state: { ...s.state, linkedCount: count } })),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
