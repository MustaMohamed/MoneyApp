import { batch, type ReadonlySignal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

import { CategoryType } from '@/constants/enums';

type CategoriesScreenSignalState = {
  activeTab: ReadonlySignal<CategoryType>;
  showAddSheet: ReadonlySignal<boolean>;
  showDeleteConfirm: ReadonlySignal<boolean>;
  showReassignSheet: ReadonlySignal<boolean>;
  isDeleting: ReadonlySignal<boolean>;
};

type CategoriesScreenStateActions = {
  setActiveTab: (tab: CategoryType) => void;
  setShowAddSheet: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setShowReassignSheet: (v: boolean) => void;
  setIsDeleting: (v: boolean) => void;
  reset: () => void;
};

export function useCategoriesScreenState(): {
  state: CategoriesScreenSignalState;
} & CategoriesScreenStateActions {
  const activeTab = useSignal(CategoryType.Expense);
  const showAddSheet = useSignal(false);
  const showDeleteConfirm = useSignal(false);
  const showReassignSheet = useSignal(false);
  const isDeleting = useSignal(false);

  const setActiveTab = useCallback(
    (tab: CategoryType) => {
      activeTab.value = tab;
    },
    [activeTab],
  );
  const setShowAddSheet = useCallback(
    (v: boolean) => {
      showAddSheet.value = v;
    },
    [showAddSheet],
  );
  const setShowDeleteConfirm = useCallback(
    (v: boolean) => {
      showDeleteConfirm.value = v;
    },
    [showDeleteConfirm],
  );
  const setShowReassignSheet = useCallback(
    (v: boolean) => {
      showReassignSheet.value = v;
    },
    [showReassignSheet],
  );
  const setIsDeleting = useCallback(
    (v: boolean) => {
      isDeleting.value = v;
    },
    [isDeleting],
  );
  const reset = useCallback(() => {
    batch(() => {
      activeTab.value = CategoryType.Expense;
      showAddSheet.value = false;
      showDeleteConfirm.value = false;
      showReassignSheet.value = false;
      isDeleting.value = false;
    });
  }, [activeTab, isDeleting, showAddSheet, showDeleteConfirm, showReassignSheet]);

  return {
    state: { activeTab, showAddSheet, showDeleteConfirm, showReassignSheet, isDeleting },
    setActiveTab,
    setShowAddSheet,
    setShowDeleteConfirm,
    setShowReassignSheet,
    setIsDeleting,
    reset,
  };
}
