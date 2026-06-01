import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

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
  const categoryStore = useCategoryStore();
  const categories = categoryStore.state.categories.value;
  const hasLoaded = categoryStore.state.hasLoaded.value;
  const {
    addCategory,
    updateCategory,
    deleteCategory,
    reassignAndDelete,
    getCategoryTransactionCount,
  } = categoryStore;
  const {
    state: screenStore,
    setEditingCategory,
    setCategoryToDelete,
    setLinkedCount,
  } = useCategoriesScreenStore();
  const editingCategory = screenStore.editingCategory.value;
  const categoryToDelete = screenStore.categoryToDelete.value;
  const linkedCount = screenStore.linkedCount.value;
  const {
    state: screenState,
    setActiveTab,
    setShowAddSheet,
    setShowDeleteConfirm,
    setShowReassignSheet,
    setIsDeleting,
  } = useCategoriesScreenState();
  const activeTab = screenState.activeTab.value;
  const showAddSheet = screenState.showAddSheet.value;
  const showDeleteConfirm = screenState.showDeleteConfirm.value;
  const showReassignSheet = screenState.showReassignSheet.value;
  const isDeleting = screenState.isDeleting.value;

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
        await updateCategory(editingCategory.id, data as UpdateCategoryInput);
      } else {
        // addCategory throws 'already exists' on name+type collision — caller catches
        // and surfaces as categoriesErrNameDuplicate form error (TC-06)
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- else-branch means editingCategory is null, so data is always NewCategoryInput
        await addCategory(data as NewCategoryInput);
      }
      closeSheet();
    },
    [addCategory, closeSheet, editingCategory, updateCategory],
  );

  /**
   * Replaces the M2a stub `hasTransactions = false`.
   *
   * Flow:
   *  1. Set isDeleting = true (disables delete affordance on CategoryRow)
   *  2. Query real transaction count from DB
   *  3. Store the count in linkedCount (used as subtitle in ReassignCategorySheet)
   *  4. Branch: count === 0 → DeleteConfirmationDialog
   *             count  > 0 → ReassignCategorySheet
   *  5. Set isDeleting = false in `finally` (TC-09 partial-failure safety)
   *
   * Note: PROTECTED_CATEGORY_IDS guard is enforced in CategoryRow — this
   * handler will never be called for protected IDs.
   */
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

  /**
   * Called from ReassignCategorySheet on confirm.
   * repository.reassignAndDelete() is atomic (withTransactionAsync) and will
   * throw if the DB transaction rolls back (TC-09). That throw propagates to
   * the caller (ReassignCategorySheet) which is responsible for surfacing the
   * error to the user.
   */
  const handleReassignConfirm = useCallback(
    async (toId: string) => {
      if (!categoryToDelete) return;
      await reassignAndDelete(categoryToDelete.id, toId);
      closeDeleteFlow();
    },
    [categoryToDelete, closeDeleteFlow, reassignAndDelete],
  );

  /**
   * Options for the reassign picker — all categories of the same type except:
   * - the category being deleted (would be a no-op and is being removed)
   *
   * Protected categories (cat_other_expense, cat_other_income) ARE valid
   * reassignment targets and are intentionally included here per Layla §2.2.
   * The picker always has at least one option because the protected "Other"
   * category can never be deleted.
   */
  const reassignOptions = useMemo(
    () =>
      categories.filter(
        (c) =>
          // oxlint-disable-next-line typescript/no-unnecessary-condition -- categoryToDelete can be null despite narrowing context
          c.type === categoryToDelete?.type &&
          // oxlint-disable-next-line typescript/no-unnecessary-condition -- categoryToDelete can be null despite narrowing context
          c.id !== categoryToDelete?.id,
      ),
    [categories, categoryToDelete],
  );

  const goBack = useCallback(() => router.back(), [router]);

  return {
    state: {
      defaultCategories,
      customCategories,
      isAtLimit,
      hasLoaded,
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
    goBack,
  };
}
