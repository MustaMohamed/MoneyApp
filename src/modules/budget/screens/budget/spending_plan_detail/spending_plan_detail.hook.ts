import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { useSpendingPlanDetailState } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.state';
import { useSpendingPlanDetailStore } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.store';
import {
  buildSpendingPlanRows,
  planIntersectsMonth,
} from '@/modules/budget/screens/budget/spending_plans.helpers';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { toLocalDateString } from '@/utils/format_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';

export function useSpendingPlanDetail() {
  const router = useRouter();
  const { id, month } = useLocalSearchParams<{ id: string; month?: string }>();
  const categories = useCategoryStore((state) => state.categories);
  const loadCategories = useCategoryStore.getState().loadCategories;
  const { sourcePlan, spend } = useSpendingPlanDetailStore(
    useShallow((state) => ({ sourcePlan: state.plan, spend: state.spend })),
  );
  const { viewState, errorMessage } = useSpendingPlanDetailState(
    useShallow((state) => ({
      viewState: state.viewState,
      errorMessage: state.errorMessage,
    })),
  );
  const openEditPlan = useBudgetState.getState().openEditPlan;
  const latestLoadRequest = useRef(0);

  const loadPlan = useCallback(async () => {
    const request = ++latestLoadRequest.current;
    const beginLoad = useSpendingPlanDetailState.getState().beginLoad;
    const finishLoad = useSpendingPlanDetailState.getState().finishLoad;
    const failLoad = useSpendingPlanDetailState.getState().failLoad;
    const setData = useSpendingPlanDetailStore.getState().setData;
    const resetData = useSpendingPlanDetailStore.getState().reset;
    beginLoad();
    try {
      const [, result] = await Promise.all([
        loadCategories(),
        budgetRepository.getSpendingPlanDetails(id),
      ]);
      if (request !== latestLoadRequest.current) return;
      if (!result) {
        resetData();
        finishLoad('notFound');
        return;
      }
      setData(result.plan, result.spend);
      finishLoad('ready');
    } catch {
      if (request !== latestLoadRequest.current) return;
      resetData();
      failLoad(Strings.budgetPlansDetailLoadError);
    }
  }, [id, loadCategories]);

  useFocusEffect(
    useCallback(() => {
      const task = runAfterInteractions(() => {
        void loadPlan();
      });
      return () => {
        task.cancel();
        latestLoadRequest.current += 1;
      };
    }, [loadPlan]),
  );

  useEffect(
    () => () => {
      latestLoadRequest.current += 1;
      useSpendingPlanDetailState.getState().reset();
      useSpendingPlanDetailStore.getState().reset();
    },
    [],
  );

  const selectedMonth = sourcePlan
    ? month && planIntersectsMonth(sourcePlan, month)
      ? month
      : sourcePlan.start_date.slice(0, 7)
    : month;
  const plan = useMemo(
    () =>
      sourcePlan && selectedMonth
        ? buildSpendingPlanRows({
            plans: [sourcePlan],
            categories,
            spendByPlanId: { [sourcePlan.id]: spend },
            selectedMonth,
            today: toLocalDateString(new Date()),
          })[0]
        : undefined,
    [categories, selectedMonth, sourcePlan, spend],
  );
  const budgetableCategories = useMemo(
    () => categories.filter((category) => category.type === CategoryType.Expense),
    [categories],
  );

  return {
    state: { viewState, errorMessage, plan, budgetableCategories },
    goBack: () => router.back(),
    retry: loadPlan,
    editPlan: () => {
      if (plan) openEditPlan(plan.id);
    },
  };
}
