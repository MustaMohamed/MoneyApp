import { create } from 'zustand';

import { CategoryType } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CategoriesScreenStateShape {
  activeTab: CategoryType;
  showAddSheet: boolean;
  showDeleteConfirm: boolean;
  showReassignSheet: boolean;
  isDeleting: boolean;
}

interface CategoriesScreenState {
  state: CategoriesScreenStateShape;
  setActiveTab: (tab: CategoryType) => void;
  setShowAddSheet: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setShowReassignSheet: (v: boolean) => void;
  setIsDeleting: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: CategoriesScreenStateShape = {
  activeTab: CategoryType.Expense,
  showAddSheet: false,
  showDeleteConfirm: false,
  showReassignSheet: false,
  isDeleting: false,
};

export const useCategoriesScreenState = createMoneyAppSelectors(
  create<CategoriesScreenState>((set) => ({
    state: INITIAL_STATE,
    setActiveTab: (tab) => set((s) => ({ state: { ...s.state, activeTab: tab } })),
    setShowAddSheet: (v) => set((s) => ({ state: { ...s.state, showAddSheet: v } })),
    setShowDeleteConfirm: (v) => set((s) => ({ state: { ...s.state, showDeleteConfirm: v } })),
    setShowReassignSheet: (v) => set((s) => ({ state: { ...s.state, showReassignSheet: v } })),
    setIsDeleting: (v) => set((s) => ({ state: { ...s.state, isDeleting: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
