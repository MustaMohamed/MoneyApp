import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType } from '@/constants/enums';
import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { useSpendingPlanDetailState } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.state';
import { buildSpendingPlanRows } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { toLocalDateString } from '@/utils/format_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';

export function useSpendingPlanDetail() {
  const router = useRouter();
  const { id, month } = useLocalSearchParams<{ id: string; month?: string }>();
  const selectedMonth = month ?? currentYearMonth();

  const { categories, categoriesLoaded } = useCategoryStore(
    useShallow((state) => ({
      categories: state.categories,
      categoriesLoaded: state.hasLoaded,
    })),
  );
  const loadCategories = useCategoryStore.getState().loadCategories;
  const { spendingPlans, spendingPlanSpendById, budgetLoaded } = useBudgetStore(
    useShallow((state) => ({
      spendingPlans: state.spendingPlans,
      spendingPlanSpendById: state.spendingPlanSpendById,
      budgetLoaded: state.loaded,
    })),
  );
  const load = useBudgetStore.getState().load;
  const openEditPlan = useBudgetState.getState().openEditPlan;
  const loadFinished = useSpendingPlanDetailState.useState.loadFinished();
  const beginLoad = useSpendingPlanDetailState.getState().beginLoad;
  const finishLoad = useSpendingPlanDetailState.getState().finishLoad;
  const resetDetailState = useSpendingPlanDetailState.getState().reset;

  useFocusEffect(
    useCallback(() => {
      beginLoad();
      const task = runAfterInteractions(() => {
        void Promise.all([loadCategories(), load(selectedMonth)]).finally(finishLoad);
      });
      return () => task.cancel();
    }, [beginLoad, finishLoad, load, loadCategories, selectedMonth]),
  );

  useEffect(() => resetDetailState, [resetDetailState]);

  const rows = useMemo(
    () =>
      buildSpendingPlanRows({
        plans: spendingPlans,
        categories,
        spendByPlanId: spendingPlanSpendById,
        selectedMonth,
        today: toLocalDateString(new Date()),
      }),
    [categories, selectedMonth, spendingPlanSpendById, spendingPlans],
  );
  const plan = useMemo(() => rows.find((row) => row.id === id), [id, rows]);
  const budgetableCategories = useMemo(
    () => categories.filter((category) => category.type === CategoryType.Expense),
    [categories],
  );
  const hasLoaded = categoriesLoaded && budgetLoaded;
  const viewState = plan
    ? ('ready' as const)
    : !hasLoaded || !loadFinished
      ? ('loading' as const)
      : ('notFound' as const);

  return {
    state: {
      viewState,
      plan,
      budgetableCategories,
    },
    goBack: () => router.back(),
    editPlan: () => {
      if (plan) openEditPlan(plan.id);
    },
  };
}
