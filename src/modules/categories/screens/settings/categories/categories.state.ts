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
    setActiveTab: (tab) => set({ activeTab: tab }),
    setShowAddSheet: (v) => set({ showAddSheet: v }),
    setShowDeleteConfirm: (v) => set({ showDeleteConfirm: v }),
    setShowReassignSheet: (v) => set({ showReassignSheet: v }),
    setIsDeleting: (v) => set({ isDeleting: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
