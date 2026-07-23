import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { BudgetGroup, CategoryType } from '@/constants/enums';
import type {
  Budget,
  BudgetMonthGroupMap,
  SpendingPlanWithCategories,
} from '@/modules/budget/entities/budget.entity';
import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import {
  buildBudgetCategoriesSummary,
  buildBudgetCopyRows,
  buildCategoryBudgetRows,
  resolveBudgetPresentation,
} from '@/modules/budget/screens/budget/budget.helpers';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import {
  buildBudgetRuleLens,
  hasBudgetRuleIncome,
  resolveBudgetRuleGroup,
} from '@/modules/budget/screens/budget/budget_buckets.helpers';
import type { NamedBudgetVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { buildSpendingPlanRows } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { computeSpendingPlansSummary } from '@/modules/budget/screens/budget/spending_plans_summary.helpers';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { formatMonthYear, toLocalDateString } from '@/utils/format_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';

const EMPTY_BUDGET_ROWS: Budget[] = [];
const EMPTY_SPENDING_PLANS: SpendingPlanWithCategories[] = [];
const EMPTY_SPEND_BY_MONTH: Record<string, Record<string, number>> = {};
const EMPTY_SPEND_BY_ID: Record<string, number> = {};
const EMPTY_BUDGET_GROUP_MAP: BudgetMonthGroupMap = {};

export interface BudgetEditTargetVM extends NamedBudgetVM {
  categoryId: string;
  categoryName: string;
  categoryGroup: BudgetGroup | null;
  icon: string;
  color: string;
  limit: number;
}

export function useBudget() {
  const router = useRouter();

  const { categories, categoriesLoaded, categoryLoadError } = useCategoryStore(
    useShallow((s) => ({
      categories: s.categories,
      categoriesLoaded: s.hasLoaded,
      categoryLoadError: s.loadError,
    })),
  );
  const loadCategories = useCategoryStore.getState().loadCategories;
  const {
    budgetRows,
    spendByMonth,
    spendByBudgetId,
    spendingPlans,
    spendingPlanSpendById,
    budgetLoaded,
    loadedMonth,
    expectedIncome,
    budgetGroupByCategoryId,
    incomeSuggestion,
    copyPreviewRows,
    copyPreviewSourceMonth,
    copyPreviewTargetMonth,
    copyPreviewLoaded,
    copyPreviewLoading,
    copyPreviewError,
    loadError,
  } = useBudgetStore(
    useShallow((s) => ({
      budgetRows: s.rows,
      spendByMonth: s.spendByMonth,
      spendByBudgetId: s.spendByBudgetId,
      spendingPlans: s.spendingPlans,
      spendingPlanSpendById: s.spendingPlanSpendById,
      budgetLoaded: s.loaded,
      loadedMonth: s.loadedMonth,
      expectedIncome: s.expectedIncome,
      budgetGroupByCategoryId: s.budgetGroupByCategoryId,
      incomeSuggestion: s.incomeSuggestion,
      copyPreviewRows: s.copyPreviewRows,
      copyPreviewSourceMonth: s.copyPreviewSourceMonth,
      copyPreviewTargetMonth: s.copyPreviewTargetMonth,
      copyPreviewLoaded: s.copyPreviewLoaded,
      copyPreviewLoading: s.copyPreviewLoading,
      copyPreviewError: s.copyPreviewError,
      loadError: s.loadError,
    })),
  );
  const load = useBudgetStore.getState().load;
  const loadCopyPreview = useBudgetStore.getState().loadCopyPreview;
  const copyBudgetsToMonth = useBudgetStore.getState().copyBudgetsToMonth;
  const removeBudget = useBudgetStore.getState().removeBudget;
  const setSpendingPlan = useBudgetStore.getState().setSpendingPlan;
  const removeSpendingPlan = useBudgetStore.getState().removeSpendingPlan;
  const openAdd = useBudgetState.getState().openAdd;
  const openAddWithContext = useBudgetState.getState().openAddWithContext;
  const openEdit = useBudgetState.getState().openEdit;
  const openAddPlan = useBudgetState.getState().openAddPlan;
  const openEditPlan = useBudgetState.getState().openEditPlan;
  const {
    selectedMonth,
    copySourceMonth,
    lensTab,
    copySheetVisible,
    copySelectedBudgetIds,
    copyBusy,
    copyError,
    refreshing,
    targetBudgetId,
    targetPlanId,
    expandedCategoryId,
    expandedBudgetGroup,
  } = useBudgetState(
    useShallow((s) => ({
      selectedMonth: s.selectedMonth,
      copySourceMonth: s.copySourceMonth,
      lensTab: s.lensTab,
      copySheetVisible: s.copySheetVisible,
      copySelectedBudgetIds: s.copySelectedBudgetIds,
      copyBusy: s.copyBusy,
      copyError: s.copyError,
      refreshing: s.refreshing,
      targetBudgetId: s.targetBudgetId,
      targetPlanId: s.targetPlanId,
      expandedCategoryId: s.expandedCategoryId,
      expandedBudgetGroup: s.expandedBudgetGroup,
    })),
  );
  const setLensTab = useBudgetState.getState().setLensTab;
  const setSelectedMonthState = useBudgetState.getState().setSelectedMonth;
  const setCopySourceMonthState = useBudgetState.getState().setCopySourceMonth;
  const openCopyState = useBudgetState.getState().openCopy;
  const closeCopy = useBudgetState.getState().closeCopy;
  const setCopySelectedBudgetIds = useBudgetState.getState().setCopySelectedBudgetIds;
  const toggleCopyBudgetId = useBudgetState.getState().toggleCopyBudgetId;
  const clearCopySelection = useBudgetState.getState().clearCopySelection;
  const setCopyBusy = useBudgetState.getState().setCopyBusy;
  const setCopyError = useBudgetState.getState().setCopyError;
  const setRefreshing = useBudgetState.getState().setRefreshing;
  const setExpandedCategoryId = useBudgetState.getState().setExpandedCategoryId;
  const setExpandedBudgetGroup = useBudgetState.getState().setExpandedBudgetGroup;
  const openIncomeSheetState = useIncomeSheetState.getState().open;

  useFocusEffect(
    useCallback(() => {
      const task = runAfterInteractions(() => {
        if (!categoriesLoaded) void loadCategories().catch(() => undefined);
        void load(selectedMonth);
      });
      return () => task.cancel();
    }, [categoriesLoaded, loadCategories, load, selectedMonth]),
  );

  const today = toLocalDateString(new Date());
  const hasMatchingBudgetSnapshot = budgetLoaded && loadedMonth === selectedMonth;
  const activeBudgetRows = hasMatchingBudgetSnapshot ? budgetRows : EMPTY_BUDGET_ROWS;
  const activeSpendByMonth = hasMatchingBudgetSnapshot ? spendByMonth : EMPTY_SPEND_BY_MONTH;
  const activeSpendByBudgetId = hasMatchingBudgetSnapshot ? spendByBudgetId : EMPTY_SPEND_BY_ID;
  const activeSpendingPlans = hasMatchingBudgetSnapshot ? spendingPlans : EMPTY_SPENDING_PLANS;
  const activeSpendingPlanSpendById = hasMatchingBudgetSnapshot
    ? spendingPlanSpendById
    : EMPTY_SPEND_BY_MONTH;
  const activeExpectedIncome = hasMatchingBudgetSnapshot ? expectedIncome : null;
  const activeBudgetGroupByCategoryId = hasMatchingBudgetSnapshot
    ? budgetGroupByCategoryId
    : EMPTY_BUDGET_GROUP_MAP;
  const activeIncomeSuggestion = hasMatchingBudgetSnapshot ? incomeSuggestion : null;

  const categoryLedger = useMemo(
    () =>
      buildCategoryBudgetRows({
        categories,
        budgets: activeBudgetRows,
        spendByMonth: activeSpendByMonth,
        spendByBudgetId: activeSpendByBudgetId,
        yearMonth: selectedMonth,
      }),
    [activeBudgetRows, activeSpendByBudgetId, activeSpendByMonth, categories, selectedMonth],
  );
  const rows = categoryLedger.rows;
  const hasConfiguredIncome = hasBudgetRuleIncome(activeExpectedIncome);

  const categoriesSummary = useMemo(
    () =>
      buildBudgetCategoriesSummary({
        rows,
        expectedIncome: activeExpectedIncome,
        unbudgetedSpend: categoryLedger.unbudgetedSpend,
        selectedMonth,
        today,
      }),
    [activeExpectedIncome, categoryLedger.unbudgetedSpend, rows, selectedMonth, today],
  );

  const overall = useMemo(
    () => ({
      budgeted: categoriesSummary.planned,
      spent: categoriesSummary.spent,
      left: categoriesSummary.left,
      pct: categoriesSummary.usedPct ?? 0,
    }),
    [categoriesSummary],
  );

  const spendingPlanRows = useMemo(
    () =>
      buildSpendingPlanRows({
        plans: activeSpendingPlans,
        categories,
        spendByPlanId: activeSpendingPlanSpendById,
        selectedMonth,
        today,
      }),
    [activeSpendingPlanSpendById, activeSpendingPlans, categories, selectedMonth, today],
  );

  const spendingPlansSummary = useMemo(
    () => computeSpendingPlansSummary(spendingPlanRows, selectedMonth),
    [selectedMonth, spendingPlanRows],
  );

  const editingRow = useMemo(
    () =>
      rows
        .flatMap((row) =>
          row.budgets.map((budget) => {
            const category = categories.find((candidate) => candidate.id === row.categoryId);
            return {
              ...budget,
              limit: budget.planned,
              categoryId: row.categoryId,
              categoryName: row.name,
              categoryGroup: category
                ? (resolveBudgetRuleGroup(
                    category,
                    activeBudgetGroupByCategoryId,
                    hasConfiguredIncome,
                  ) ?? null)
                : null,
              icon: row.icon,
              color: row.color,
            };
          }),
        )
        .find((budget) => budget.id === targetBudgetId),
    [activeBudgetGroupByCategoryId, categories, hasConfiguredIncome, rows, targetBudgetId],
  );

  const editingPlan = useMemo(
    () => spendingPlanRows.find((row) => row.id === targetPlanId),
    [spendingPlanRows, targetPlanId],
  );

  const ruleLens = useMemo(
    () =>
      buildBudgetRuleLens({
        income: activeExpectedIncome,
        categories,
        budgets: activeBudgetRows,
        budgetGroupByCategoryId: activeBudgetGroupByCategoryId,
        spendByMonth: activeSpendByMonth,
        selectedMonth,
        lifecycleDate: today,
      }),
    [
      activeBudgetGroupByCategoryId,
      activeBudgetRows,
      activeExpectedIncome,
      activeSpendByMonth,
      categories,
      selectedMonth,
      today,
    ],
  );

  // Expense categories remain selectable even when they already have a budget,
  // because phase 1 allows multiple named budgets per category/month.
  const budgetableCategories = useMemo(
    () => categories.filter((c) => c.type === CategoryType.Expense),
    [categories],
  );

  const hasMatchingCopyPreview =
    copyPreviewLoaded &&
    copyPreviewSourceMonth === copySourceMonth &&
    copyPreviewTargetMonth === selectedMonth;
  const copyRows = useMemo(
    () =>
      buildBudgetCopyRows({
        rows: hasMatchingCopyPreview ? copyPreviewRows : [],
        categories,
        sourceMonth: copySourceMonth,
        targetMonth: selectedMonth,
      }),
    [categories, copyPreviewRows, copySourceMonth, hasMatchingCopyPreview, selectedMonth],
  );
  const copyPreviewMatchesSelection =
    copyPreviewSourceMonth === copySourceMonth && copyPreviewTargetMonth === selectedMonth;
  const copyPreviewIsLoading =
    copySheetVisible &&
    (!copyPreviewMatchesSelection ||
      copyPreviewLoading ||
      (!copyPreviewLoaded && !copyPreviewError));
  const copyPreviewHasError = copySheetVisible && copyPreviewMatchesSelection && copyPreviewError;

  useEffect(() => {
    if (copySheetVisible && hasMatchingCopyPreview) {
      setCopySelectedBudgetIds(copyRows.map((row) => row.id));
    }
  }, [copyRows, copySheetVisible, hasMatchingCopyPreview, setCopySelectedBudgetIds]);

  const daysLeft = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const today = new Date();
    const isCurrent = currentYearMonth(today) === selectedMonth;
    return isCurrent ? Math.max(0, lastDay - today.getDate()) : 0;
  }, [selectedMonth]);

  const goToCategory = (categoryId: string) => {
    router.push({
      pathname: '/(app)/(tabs)/budget/[id]',
      params: { id: categoryId, month: selectedMonth },
    });
  };

  const setSelectedMonth = useCallback(
    (month: string) => {
      setSelectedMonthState(month);
    },
    [setSelectedMonthState],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const tasks: Promise<void>[] = [load(selectedMonth)];
      if (!categoriesLoaded) tasks.push(loadCategories());
      await Promise.all(tasks);
    } finally {
      setRefreshing(false);
    }
  }, [categoriesLoaded, load, loadCategories, selectedMonth, setRefreshing]);

  const openCopy = useCallback(() => {
    clearCopySelection();
    openCopyState();
    void loadCopyPreview(copySourceMonth, selectedMonth);
  }, [clearCopySelection, copySourceMonth, loadCopyPreview, openCopyState, selectedMonth]);

  const setCopySourceMonth = useCallback(
    (month: string) => {
      setCopySourceMonthState(month);
      clearCopySelection();
      setCopyError(false);
      void loadCopyPreview(month, selectedMonth);
    },
    [clearCopySelection, loadCopyPreview, selectedMonth, setCopyError, setCopySourceMonthState],
  );

  const retryCopyPreview = useCallback(() => {
    void loadCopyPreview(copySourceMonth, selectedMonth);
  }, [copySourceMonth, loadCopyPreview, selectedMonth]);

  const copySelectedBudgets = useCallback(
    async (budgetIds = copySelectedBudgetIds) => {
      if (useBudgetState.getState().copyBusy || budgetIds.length === 0) return;
      setCopyBusy(true);
      setCopyError(false);
      try {
        await copyBudgetsToMonth(copySourceMonth, selectedMonth, budgetIds);
        closeCopy();
      } catch {
        setCopyError(true);
      } finally {
        setCopyBusy(false);
      }
    },
    [
      closeCopy,
      copyBudgetsToMonth,
      copySelectedBudgetIds,
      copySourceMonth,
      selectedMonth,
      setCopyBusy,
      setCopyError,
    ],
  );

  const selectAllCopyBudgets = useCallback(() => {
    setCopySelectedBudgetIds(copyRows.map((row) => row.id));
  }, [copyRows, setCopySelectedBudgetIds]);

  const removeBudgetForMonth = useCallback(
    async ({ id }: { id: string; name: string }) => {
      await removeBudget(id, selectedMonth);
    },
    [removeBudget, selectedMonth],
  );

  const removeSpendingPlanForMonth = useCallback(
    async ({ id }: { id: string; name: string }) => {
      await removeSpendingPlan(id, selectedMonth);
    },
    [removeSpendingPlan, selectedMonth],
  );

  const openPlanTool = useCallback(() => {
    if (lensTab === 'plans') {
      openAddPlan();
      return;
    }
    setLensTab('plans');
  }, [lensTab, openAddPlan, setLensTab]);

  const openPlanDetails = useCallback(
    (planId: string) => {
      router.push({
        pathname: '/(app)/(tabs)/budget/plans/[id]',
        params: { id: planId, month: selectedMonth },
      });
    },
    [router, selectedMonth],
  );

  const openIncomeSheet = useCallback(() => {
    openIncomeSheetState(
      activeIncomeSuggestion,
      activeExpectedIncome,
      selectedMonth,
      formatMonthYear(selectedMonth),
    );
  }, [activeExpectedIncome, activeIncomeSuggestion, openIncomeSheetState, selectedMonth]);

  const manageRuleGroup = useCallback(
    (group: BudgetGroup) => {
      const bucket = ruleLens.buckets.find((candidate) => candidate.group === group);
      const contributorIds = new Set(
        bucket?.contributors.map((contributor) => contributor.categoryId) ?? [],
      );
      const firstMatchingCategory = rows.find((row) => contributorIds.has(row.categoryId));
      const contextualCategoryId =
        bucket?.contributors[0]?.categoryId ??
        categories.find(
          (category) =>
            category.type === CategoryType.Expense &&
            resolveBudgetRuleGroup(category, activeBudgetGroupByCategoryId, hasConfiguredIncome) ===
              group,
        )?.id;
      setLensTab('categories');
      setExpandedCategoryId(firstMatchingCategory?.categoryId);
      if (!firstMatchingCategory) openAddWithContext(contextualCategoryId, group);
    },
    [
      activeBudgetGroupByCategoryId,
      categories,
      hasConfiguredIncome,
      openAddWithContext,
      rows,
      ruleLens.buckets,
      setExpandedCategoryId,
      setLensTab,
    ],
  );

  return {
    state: {
      rows,
      categoriesSummary,
      editingRow,
      overall,
      spendingPlanRows,
      editingPlan,
      spendingPlansSummary,
      month: selectedMonth,
      daysLeft,
      hasBudgets: rows.length > 0,
      hasSpendingPlans: spendingPlanRows.length > 0,
      budgetableCategories,
      ruleLens,
      suggestion: activeIncomeSuggestion,
      lensTab,
      copySourceMonth,
      copyRows,
      copySheetVisible,
      copySelectedBudgetIds,
      copyPreviewLoading: copyPreviewIsLoading,
      copyPreviewError: copyPreviewHasError,
      copyBusy,
      copyError,
      refreshing,
      presentation: resolveBudgetPresentation({
        hasMatchingSnapshot: categoriesLoaded && hasMatchingBudgetSnapshot,
        loadError: loadError || categoryLoadError,
      }),
      loadError: loadError || categoryLoadError,
      expandedCategoryId,
      expandedBudgetGroup,
      hasLoaded: Boolean(categoriesLoaded && hasMatchingBudgetSnapshot),
    },
    openAdd,
    openEdit,
    openAddPlan,
    openEditPlan,
    openPlanTool,
    openPlanDetails,
    openIncomeSheet,
    openMonthlyIncome: openIncomeSheet,
    setLensTab,
    setExpandedCategoryId,
    setExpandedBudgetGroup,
    manageRuleGroup,
    setSelectedMonth,
    openCopy,
    closeCopy,
    toggleCopyBudgetId,
    selectAllCopyBudgets,
    clearCopySelection,
    setCopySourceMonth,
    retryCopyPreview,
    copySelectedBudgets,
    removeBudgetForMonth,
    removeSpendingPlanForMonth,
    setSpendingPlan,
    removeSpendingPlan,
    refresh,
    goToCategory,
  };
}
