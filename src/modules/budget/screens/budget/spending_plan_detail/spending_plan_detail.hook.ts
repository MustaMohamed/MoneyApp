import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType } from '@/constants/enums';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import {
  resolveSpendingPlanDetailViewState,
  spendingPlanDetailShowsBody,
} from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.helpers';
import {
  INITIAL_UI_ENTRY,
  useSpendingPlanDetailState,
} from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.state';
import {
  INITIAL_DATA_ENTRY,
  useSpendingPlanDetailStore,
} from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.store';
import {
  buildSpendingPlanRows,
  planIntersectsMonth,
} from '@/modules/budget/screens/budget/spending_plans.helpers';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { toLocalDateString } from '@/utils/format_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { useLocalDayChange } from '@/utils/use_local_day_change.hook';

export function useSpendingPlanDetail() {
  const router = useRouter();
  const owner = useId();
  const { id, month } = useLocalSearchParams<{ id: string; month?: string }>();
  const categories = useCategoryStore((state) => state.categories);
  const loadCategories = useCategoryStore.getState().loadCategories;
  const entry = useSpendingPlanDetailStore(
    useShallow((state) => state.entries[owner] ?? INITIAL_DATA_ENTRY),
  );
  const { activeId, status, refreshError } = useSpendingPlanDetailState(
    useShallow((state) => state.entries[owner] ?? INITIAL_UI_ENTRY),
  );
  const openEditPlan = useBudgetState.getState().openEditPlan;
  const latestLoadRequest = useRef(0);

  const loadPlan = useCallback(async () => {
    const request = ++latestLoadRequest.current;
    const { beginLoad, resolve, failLoad } = useSpendingPlanDetailState.getState();
    const setDetail = useSpendingPlanDetailStore.getState().setDetail;
    const held = useSpendingPlanDetailStore.getState().entries[owner] ?? INITIAL_DATA_ENTRY;
    const preserveData = held.planId === id && held.plan !== undefined;
    const loadedOn = toLocalDateString(new Date());
    beginLoad(owner, id, preserveData);
    try {
      const [, result] = await Promise.all([
        loadCategories(),
        budgetRepository.getSpendingPlanDetails(id),
      ]);
      if (request !== latestLoadRequest.current) return;
      setDetail(owner, id, { plan: result?.plan, spend: result?.spend ?? {}, loadedOn });
      resolve(owner, id);
    } catch {
      if (request !== latestLoadRequest.current) return;
      failLoad(owner, id, preserveData);
    }
  }, [id, loadCategories, owner]);

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

  const retry = useCallback(() => {
    void loadPlan();
  }, [loadPlan]);
  useLocalDayChange(retry);

  useEffect(
    () => () => {
      latestLoadRequest.current += 1;
      useSpendingPlanDetailState.getState().release(owner);
      useSpendingPlanDetailStore.getState().release(owner);
    },
    [owner],
  );

  const holdsRoute = entry.planId === id;
  const sourcePlan = holdsRoute ? entry.plan : undefined;
  const { spend, loadedOn } = entry;
  const selectedMonth = sourcePlan
    ? month && planIntersectsMonth(sourcePlan, month)
      ? month
      : sourcePlan.start_date.slice(0, 7)
    : month;
  const plan = useMemo(
    () =>
      sourcePlan && selectedMonth && loadedOn
        ? buildSpendingPlanRows({
            plans: [sourcePlan],
            categories,
            spendByPlanId: { [sourcePlan.id]: spend },
            selectedMonth,
            today: loadedOn,
          })[0]
        : undefined,
    [categories, loadedOn, selectedMonth, sourcePlan, spend],
  );
  const budgetableCategories = useMemo(
    () => categories.filter((category) => category.type === CategoryType.Expense),
    [categories],
  );
  const viewState = resolveSpendingPlanDetailViewState({
    hasPlan: sourcePlan !== undefined,
    ownsStatus: activeId === id,
    status,
    refreshError,
  });

  return {
    state: {
      viewState,
      showsBody: spendingPlanDetailShowsBody(viewState),
      plan,
      budgetableCategories,
    },
    goBack: () => router.back(),
    retry,
    reload: loadPlan,
    editPlan: () => {
      if (plan) openEditPlan('planDetail', plan.id);
    },
  };
}
