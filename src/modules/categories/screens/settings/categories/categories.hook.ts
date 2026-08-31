import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type {
  Category,
  NewCategoryInput,
  UpdateCategoryInput,
} from '@/modules/categories/store/category.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

import { useCategoriesScreenState } from './categories.state';
import { useCategoriesScreenStore } from './categories.store';

export function useCategories() {
  const router = useRouter();
  const { categories, hasLoaded, loadError } = useCategoryStore(
    useShallow((s) => ({
      categories: s.categories,
      hasLoaded: s.hasLoaded,
      loadError: s.loadError,
    })),
  );
  const loadCategories = useCategoryStore.getState().loadCategories;
  const addCategory = useCategoryStore.getState().addCategory;
  const updateCategory = useCategoryStore.getState().updateCategory;
  const deleteCategory = useCategoryStore.getState().deleteCategory;
  const reassignAndDelete = useCategoryStore.getState().reassignAndDelete;
  const getCategoryTransactionCount = useCategoryStore.getState().getCategoryTransactionCount;
  const { editingCategory, categoryToDelete, linkedCount } = useCategoriesScreenStore(
    useShallow((s) => ({
      editingCategory: s.editingCategory,
      categoryToDelete: s.categoryToDelete,
      linkedCount: s.linkedCount,
    })),
  );
  const setEditingCategory = useCategoriesScreenStore.getState().setEditingCategory;
  const setCategoryToDelete = useCategoriesScreenStore.getState().setCategoryToDelete;
  const setLinkedCount = useCategoriesScreenStore.getState().setLinkedCount;
  const { activeTab, showAddSheet, showDeleteConfirm, showReassignSheet, isDeleting } =
    useCategoriesScreenState(
      useShallow((s) => ({
        activeTab: s.activeTab,
        showAddSheet: s.showAddSheet,
        showDeleteConfirm: s.showDeleteConfirm,
        showReassignSheet: s.showReassignSheet,
        isDeleting: s.isDeleting,
      })),
    );
  const setActiveTab = useCategoriesScreenState.getState().setActiveTab;
  const setShowAddSheet = useCategoriesScreenState.getState().setShowAddSheet;
  const setShowDeleteConfirm = useCategoriesScreenState.getState().setShowDeleteConfirm;
  const setShowReassignSheet = useCategoriesScreenState.getState().setShowReassignSheet;
  const setIsDeleting = useCategoriesScreenState.getState().setIsDeleting;

  const displayedCategories = useMemo(
    () => categories.filter((c) => c.type === activeTab),
    [activeTab, categories],
  );
  const defaultCategories = useMemo(
    () => displayedCategories.filter((c) => c.is_default === 1),
    [displayedCategories],
  );
  const customCategories = useMemo(
    () => displayedCategories.filter((c) => c.is_default === 0),
    [displayedCategories],
  );
  const customCount = useMemo(
    () => categories.filter((c) => c.is_default === 0).length,
    [categories],
  );
  const isAtLimit = customCount >= 30;

  const openAddSheet = useCallback(() => {
    setEditingCategory(null);
    setShowAddSheet(true);
  }, [setEditingCategory, setShowAddSheet]);

  const openEditSheet = useCallback(
    (category: Category) => {
      setEditingCategory(category);
      setShowAddSheet(true);
    },
    [setEditingCategory, setShowAddSheet],
  );

  const closeSheet = useCallback(() => {
    setShowAddSheet(false);
    setEditingCategory(null);
  }, [setEditingCategory, setShowAddSheet]);

  const openDeleteConfirm = useCallback(
    (category: Category) => {
      setCategoryToDelete(category);
      setShowDeleteConfirm(true);
    },
    [setCategoryToDelete, setShowDeleteConfirm],
  );

  const openReassignSheet = useCallback(
    (category: Category) => {
      setCategoryToDelete(category);
      setShowReassignSheet(true);
    },
    [setCategoryToDelete, setShowReassignSheet],
  );

  const closeDeleteFlow = useCallback(() => {
    setCategoryToDelete(null);
    setShowDeleteConfirm(false);
    setShowReassignSheet(false);
    setLinkedCount(0);
  }, [setCategoryToDelete, setLinkedCount, setShowDeleteConfirm, setShowReassignSheet]);

  const handleSave = useCallback(
    async (data: NewCategoryInput | UpdateCategoryInput) => {
      if (editingCategory) {
        await updateCategory(editingCategory.id, data);
      } else {
        // `addCategory` throws 'already exists' on a name+type collision; the caller surfaces it.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- else-branch means editingCategory is null, so data is always NewCategoryInput
        await addCategory(data as NewCategoryInput);
      }
      closeSheet();
    },
    [addCategory, closeSheet, editingCategory, updateCategory],
  );

  /** The protected-ID guard lives in `CategoryRow`; this never sees a protected ID. */
  const handleDeletePress = useCallback(
    async (category: Category) => {
      setIsDeleting(true);
      try {
        const count = await getCategoryTransactionCount(category.id);
        setLinkedCount(count);
        if (count > 0) {
          openReassignSheet(category);
        } else {
          openDeleteConfirm(category);
        }
      } finally {
        setIsDeleting(false);
      }
    },
    [
      getCategoryTransactionCount,
      openDeleteConfirm,
      openReassignSheet,
      setIsDeleting,
      setLinkedCount,
    ],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!categoryToDelete) return;
    await deleteCategory(categoryToDelete.id);
    closeDeleteFlow();
  }, [categoryToDelete, closeDeleteFlow, deleteCategory]);

  /** `reassignAndDelete` is atomic and throws on rollback; the caller surfaces the error. */
  const handleReassignConfirm = useCallback(
    async (toId: string) => {
      if (!categoryToDelete) return;
      await reassignAndDelete(categoryToDelete.id, toId);
      closeDeleteFlow();
    },
    [categoryToDelete, closeDeleteFlow, reassignAndDelete],
  );

  /** The protected "Other" categories are valid reassign targets, so they stay in the list. */
  const reassignOptions = useMemo(
    () =>
      categories.filter(
        // Only the first access needs `?.`; `&&` short-circuits and narrows the right-hand side.
        (c) => c.type === categoryToDelete?.type && c.id !== categoryToDelete.id,
      ),
    [categories, categoryToDelete],
  );

  const goBack = useCallback(() => router.back(), [router]);
  const retryLoad = useCallback(async () => {
    try {
      await loadCategories();
    } catch {
      // The category store owns the retryable error state.
    }
  }, [loadCategories]);

  return {
    state: {
      defaultCategories,
      customCategories,
      isAtLimit,
      hasLoaded,
      loadError,
      activeTab,
      showAddSheet,
      editingCategory,
      categoryToDelete,
      showDeleteConfirm,
      showReassignSheet,
      reassignOptions,
      linkedCount,
      isDeleting,
    },
    setActiveTab,
    openAddSheet,
    openEditSheet,
    closeSheet,
    handleSave,
    handleDeletePress,
    handleDeleteConfirm,
    handleReassignConfirm,
    closeDeleteFlow,
    retryLoad,
    goBack,
  };
}
