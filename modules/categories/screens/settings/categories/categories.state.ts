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

type CategoriesScreenState = CategoriesScreenStateShape & {
  setActiveTab: (tab: CategoryType) => void;
  setShowAddSheet: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setShowReassignSheet: (v: boolean) => void;
  setIsDeleting: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: CategoriesScreenStateShape = {
  activeTab: CategoryType.Expense,
  showAddSheet: false,
  showDeleteConfirm: false,
  showReassignSheet: false,
  isDeleting: false,
};

export const useCategoriesScreenState = createMoneyAppSelectors(
  create<CategoriesScreenState>((set) => ({
    ...INITIAL_STATE,
    setActiveTab: (tab) => set((s) => ({ ...s, activeTab: tab })),
    setShowAddSheet: (v) => set((s) => ({ ...s, showAddSheet: v })),
    setShowDeleteConfirm: (v) => set((s) => ({ ...s, showDeleteConfirm: v })),
    setShowReassignSheet: (v) => set((s) => ({ ...s, showReassignSheet: v })),
    setIsDeleting: (v) => set((s) => ({ ...s, isDeleting: v })),
    reset: () => set(INITIAL_STATE),
  })),
);
