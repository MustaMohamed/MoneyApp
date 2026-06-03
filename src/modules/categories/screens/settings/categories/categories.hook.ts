import { useSignals } from '@preact/signals-react/runtime';
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
  useSignals();
  const router = useRouter();
  const categoryStore = useCategoryStore();
  const categories = categoryStore.categories;
  const hasLoaded = categoryStore.hasLoaded;
  const addCategory = categoryStore.addCategory;
  const updateCategory = categoryStore.updateCategory;
  const deleteCategory = categoryStore.deleteCategory;
  const reassignAndDelete = categoryStore.reassignAndDelete;
  const getCategoryTransactionCount = categoryStore.getCategoryTransactionCount;
  const {
    state: screenStoreState,
    setEditingCategory,
    setCategoryToDelete,
    setLinkedCount,
  } = useCategoriesScreenStore();
  const {
    state: screenState,
    setActiveTab,
    setShowAddSheet,
    setShowDeleteConfirm,
    setShowReassignSheet,
    setIsDeleting,
  } = useCategoriesScreenState();
  const activeTabValue = screenState.activeTab.value;
  const categoryToDeleteValue = screenStoreState.categoryToDelete.value;

  const displayedCategories = useMemo(
    () => categories.filter((c) => c.type === activeTabValue),
    [activeTabValue, categories],
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
      const category = screenStoreState.editingCategory.value;
      if (category) {
        await updateCategory(category.id, data as UpdateCategoryInput);
      } else {
        // addCategory throws 'already exists' on name+type collision — caller catches
        // and surfaces as categoriesErrNameDuplicate form error (TC-06)
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- else-branch means editingCategory is null, so data is always NewCategoryInput
        await addCategory(data as NewCategoryInput);
      }
      closeSheet();
    },
    [addCategory, closeSheet, screenStoreState.editingCategory, updateCategory],
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
    const category = screenStoreState.categoryToDelete.value;
    if (!category) return;
    await deleteCategory(category.id);
    closeDeleteFlow();
  }, [closeDeleteFlow, deleteCategory, screenStoreState.categoryToDelete]);

  /**
   * Called from ReassignCategorySheet on confirm.
   * repository.reassignAndDelete() is atomic (withTransactionAsync) and will
   * throw if the DB transaction rolls back (TC-09). That throw propagates to
   * the caller (ReassignCategorySheet) which is responsible for surfacing the
   * error to the user.
   */
  const handleReassignConfirm = useCallback(
    async (toId: string) => {
      const category = screenStoreState.categoryToDelete.value;
      if (!category) return;
      await reassignAndDelete(category.id, toId);
      closeDeleteFlow();
    },
    [closeDeleteFlow, reassignAndDelete, screenStoreState.categoryToDelete],
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
          c.type === categoryToDeleteValue?.type &&
          // oxlint-disable-next-line typescript/no-unnecessary-condition -- categoryToDelete can be null despite narrowing context
          c.id !== categoryToDeleteValue?.id,
      ),
    [categories, categoryToDeleteValue],
  );

  const goBack = useCallback(() => router.back(), [router]);

  return {
    state: {
      defaultCategories,
      customCategories,
      isAtLimit,
      hasLoaded,
      activeTab: screenState.activeTab,
      showAddSheet: screenState.showAddSheet,
      editingCategory: screenStoreState.editingCategory,
      categoryToDelete: screenStoreState.categoryToDelete,
      showDeleteConfirm: screenState.showDeleteConfirm,
      showReassignSheet: screenState.showReassignSheet,
      reassignOptions,
      linkedCount: screenStoreState.linkedCount,
      isDeleting: screenState.isDeleting,
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
