import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { BudgetGroup, CategoryType } from '@/constants/enums';
import { getDb } from '@/database/client';
import { getTrailingIncomeSuggestion } from '@/modules/budget/database/budget_stats';
import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import {
  buildBudgetCategoriesSummary,
  buildBudgetCopyRows,
  buildCategoryBudgetRows,
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
  const incomeSuggestionRequest = useRef(0);

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
      loadError: s.loadError,
    })),
  );
  const load = useBudgetStore.getState().load;
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
    incomeSuggestion,
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
      incomeSuggestion: s.incomeSuggestion,
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
  const setIncomeSuggestion = useBudgetState.getState().setIncomeSuggestion;
  const setRefreshing = useBudgetState.getState().setRefreshing;
  const setExpandedCategoryId = useBudgetState.getState().setExpandedCategoryId;
  const setExpandedBudgetGroup = useBudgetState.getState().setExpandedBudgetGroup;
  const openIncomeSheetState = useIncomeSheetState.getState().open;

  const loadIncomeSuggestion = useCallback(
    async (month: string) => {
      const request = ++incomeSuggestionRequest.current;
      try {
        const db = await getDb();
        const s = await getTrailingIncomeSuggestion(db, month);
        if (request === incomeSuggestionRequest.current) setIncomeSuggestion(s);
      } catch {
        if (request === incomeSuggestionRequest.current) setIncomeSuggestion(null);
      }
    },
    [setIncomeSuggestion],
  );

  useFocusEffect(
    useCallback(() => {
      const task = runAfterInteractions(() => {
        void loadCategories().catch(() => undefined);
        void load(selectedMonth);
        void loadIncomeSuggestion(selectedMonth);
      });
      return () => task.cancel();
    }, [loadCategories, load, loadIncomeSuggestion, selectedMonth]),
  );

  const today = toLocalDateString(new Date());

  const categoryLedger = useMemo(
    () =>
      buildCategoryBudgetRows({
        categories,
        budgets: budgetRows,
        spendByMonth,
        spendByBudgetId,
        yearMonth: selectedMonth,
      }),
    [budgetRows, categories, selectedMonth, spendByBudgetId, spendByMonth],
  );
  const rows = categoryLedger.rows;
  const hasConfiguredIncome = hasBudgetRuleIncome(expectedIncome);

  const categoriesSummary = useMemo(
    () =>
      buildBudgetCategoriesSummary({
        rows,
        expectedIncome,
        unbudgetedSpend: categoryLedger.unbudgetedSpend,
        selectedMonth,
        today,
      }),
    [categoryLedger.unbudgetedSpend, expectedIncome, rows, selectedMonth, today],
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
        plans: spendingPlans,
        categories,
        spendByPlanId: spendingPlanSpendById,
        selectedMonth,
        today,
      }),
    [categories, selectedMonth, spendingPlanSpendById, spendingPlans, today],
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
                ? (resolveBudgetRuleGroup(category, budgetGroupByCategoryId, hasConfiguredIncome) ??
                  null)
                : null,
              icon: row.icon,
              color: row.color,
            };
          }),
        )
        .find((budget) => budget.id === targetBudgetId),
    [budgetGroupByCategoryId, categories, hasConfiguredIncome, rows, targetBudgetId],
  );

  const editingPlan = useMemo(
    () => spendingPlanRows.find((row) => row.id === targetPlanId),
    [spendingPlanRows, targetPlanId],
  );

  const ruleLens = useMemo(
    () =>
      buildBudgetRuleLens({
        income: expectedIncome,
        categories,
        budgets: budgetRows,
        budgetGroupByCategoryId,
        spendByMonth,
        selectedMonth,
        lifecycleDate: today,
      }),
    [
      budgetGroupByCategoryId,
      budgetRows,
      categories,
      expectedIncome,
      selectedMonth,
      spendByMonth,
      today,
    ],
  );

  // Expense categories remain selectable even when they already have a budget,
  // because phase 1 allows multiple named budgets per category/month.
  const budgetableCategories = useMemo(
    () => categories.filter((c) => c.type === CategoryType.Expense),
    [categories],
  );

  const copyRows = useMemo(
    () =>
      buildBudgetCopyRows({
        rows: budgetRows,
        categories,
        sourceMonth: copySourceMonth,
        targetMonth: selectedMonth,
      }),
    [budgetRows, categories, copySourceMonth, selectedMonth],
  );

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
      setIncomeSuggestion(null);
      void load(month);
      void loadIncomeSuggestion(month);
    },
    [load, loadIncomeSuggestion, setIncomeSuggestion, setSelectedMonthState],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadCategories(),
        load(selectedMonth),
        loadIncomeSuggestion(selectedMonth),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [load, loadCategories, loadIncomeSuggestion, selectedMonth, setRefreshing]);

  const openCopy = useCallback(() => {
    openCopyState(copyRows.map((row) => row.id));
  }, [copyRows, openCopyState]);

  const setCopySourceMonth = useCallback(
    (month: string) => {
      setCopySourceMonthState(month);
      const rowsForSource = buildBudgetCopyRows({
        rows: budgetRows,
        categories,
        sourceMonth: month,
        targetMonth: selectedMonth,
      });
      setCopySelectedBudgetIds(rowsForSource.map((row) => row.id));
    },
    [budgetRows, categories, selectedMonth, setCopySelectedBudgetIds, setCopySourceMonthState],
  );

  const copySelectedBudgets = useCallback(
    async (budgetIds = copySelectedBudgetIds) => {
      await copyBudgetsToMonth(copySourceMonth, selectedMonth, budgetIds);
      closeCopy();
    },
    [closeCopy, copyBudgetsToMonth, copySelectedBudgetIds, copySourceMonth, selectedMonth],
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
      incomeSuggestion,
      expectedIncome,
      selectedMonth,
      formatMonthYear(selectedMonth),
    );
  }, [expectedIncome, incomeSuggestion, openIncomeSheetState, selectedMonth]);

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
            resolveBudgetRuleGroup(category, budgetGroupByCategoryId, hasConfiguredIncome) ===
              group,
        )?.id;
      setLensTab('categories');
      setExpandedCategoryId(firstMatchingCategory?.categoryId);
      if (!firstMatchingCategory) openAddWithContext(contextualCategoryId, group);
    },
    [
      budgetGroupByCategoryId,
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
      suggestion: incomeSuggestion,
      lensTab,
      copySourceMonth,
      copyRows,
      copySheetVisible,
      copySelectedBudgetIds,
      refreshing,
      loadError: loadError || categoryLoadError,
      expandedCategoryId,
      expandedBudgetGroup,
      hasLoaded: Boolean(
        categoriesLoaded &&
        budgetLoaded &&
        (loadedMonth === undefined || loadedMonth === selectedMonth),
      ),
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
    copySelectedBudgets,
    removeBudgetForMonth,
    removeSpendingPlanForMonth,
    setSpendingPlan,
    removeSpendingPlan,
    refresh,
    goToCategory,
  };
}
