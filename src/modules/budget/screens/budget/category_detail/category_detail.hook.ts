import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { DetailHeroModel } from '@/components/ui/detail_hero';
import { lastMonths } from '@/modules/budget/repositories/budget.repository';
import {
  type CategoryMonthVM,
  computeCategoryHistory,
  computeStatus,
  resolveLimitForMonth,
} from '@/modules/budget/screens/budget/budget.helpers';
import {
  hasBudgetRuleIncome,
  resolveBudgetRuleGroup,
} from '@/modules/budget/screens/budget/budget_buckets.helpers';
import {
  type CategoryBudgetsCardVM,
  buildCategoryBudgetsCard,
  buildCategoryDetailHero,
  resolveCategoryDetailViewState,
  resolveMonthLifecycle,
} from '@/modules/budget/screens/budget/category_detail/category_detail.helpers';
import { useCategoryDetailState } from '@/modules/budget/screens/budget/category_detail/category_detail.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { toLocalDateString } from '@/utils/format_date';
import { useLocalToday } from '@/utils/use_local_today.hook';

const HISTORY_MONTHS = 12;

export function useCategoryDetail() {
  const router = useRouter();
  const { id, month: routeMonth } = useLocalSearchParams<{ id: string; month?: string }>();
  const storedMonth = useCategoryDetailState.useState.month();
  const setMonth = useCategoryDetailState.getState().setMonth;
  const validRouteMonth =
    typeof routeMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(routeMonth)
      ? routeMonth
      : undefined;
  const today = useLocalToday(toLocalDateString(new Date()), true);
  const currentMonth = today.slice(0, 7);
  const month = validRouteMonth ?? (storedMonth === currentMonth ? storedMonth : currentMonth);

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
    budgetLoaded,
    loadedMonth,
    loadError,
    expectedIncome,
    budgetGroupByCategoryId,
  } = useBudgetStore(
    useShallow((s) => ({
      budgetRows: s.rows,
      spendByMonth: s.spendByMonth,
      spendByBudgetId: s.spendByBudgetId,
      budgetLoaded: s.loaded,
      loadedMonth: s.loadedMonth,
      loadError: s.loadError,
      expectedIncome: s.expectedIncome,
      budgetGroupByCategoryId: s.budgetGroupByCategoryId,
    })),
  );
  const load = useBudgetStore.getState().load;

  const focusMonth = validRouteMonth ?? currentMonth;
  useFocusEffect(
    useCallback(() => {
      setMonth(focusMonth);
      const categoryStore = useCategoryStore.getState();
      if (!categoryStore.hasLoaded || categoryStore.loadError) {
        void loadCategories().catch(() => undefined);
      }
      void load(focusMonth).catch(() => undefined);
    }, [focusMonth, loadCategories, load, setMonth]),
  );

  const category = useMemo(() => categories.find((c) => c.id === id), [categories, id]);
  const hasLoaded = categoriesLoaded && budgetLoaded && loadedMonth === month;
  const viewState = resolveCategoryDetailViewState({
    hasLoaded,
    hasCategory: category !== undefined,
    loadError: loadError || categoryLoadError,
  });

  const results: CategoryMonthVM[] = useMemo(() => {
    if (!hasLoaded || !id) return [];
    const months = lastMonths(month, HISTORY_MONTHS);
    const out: CategoryMonthVM[] = [];
    for (const ym of months) {
      const limit = resolveLimitForMonth(budgetRows, id, ym);
      if (limit === null && ym !== month) continue; // only months the budget was active, and the selected one
      const spent = spendByMonth[id]?.[ym] ?? 0;
      const lifecycle = resolveMonthLifecycle(ym, currentMonth);
      const base = { yearMonth: ym, spent, isProvisional: lifecycle === 'provisional', lifecycle };
      out.push(
        limit === null
          ? { ...base, limit: undefined, delta: undefined, status: undefined }
          : { ...base, limit, delta: limit - spent, status: computeStatus(spent, limit) },
      );
    }
    return out;
  }, [budgetRows, currentMonth, hasLoaded, id, month, spendByMonth]);

  const history = useMemo(() => computeCategoryHistory(results), [results]);
  const hero: DetailHeroModel | undefined = useMemo(() => {
    if (!hasLoaded || category === undefined) return undefined;
    return buildCategoryDetailHero({
      category,
      limit: resolveLimitForMonth(budgetRows, category.id, month) ?? undefined,
      spent: spendByMonth[category.id]?.[month] ?? 0,
      month,
      today,
      group: resolveBudgetRuleGroup(
        category,
        budgetGroupByCategoryId,
        hasBudgetRuleIncome(expectedIncome),
      ),
    });
  }, [
    budgetGroupByCategoryId,
    budgetRows,
    category,
    expectedIncome,
    hasLoaded,
    month,
    spendByMonth,
    today,
  ]);
  const budgetsCard: CategoryBudgetsCardVM | undefined = useMemo(() => {
    if (!hasLoaded || category === undefined) return undefined;
    return buildCategoryBudgetsCard({
      category,
      budgets: budgetRows,
      spendByMonth,
      spendByBudgetId,
      month,
      currentMonth,
    });
  }, [budgetRows, category, currentMonth, hasLoaded, month, spendByBudgetId, spendByMonth]);

  return {
    state: {
      budgetsCard,
      history,
      hero,
      month,
      viewState,
    },
    goBack: () => router.back(),
    retry: () => {
      const categoryStore = useCategoryStore.getState();
      if (!categoryStore.hasLoaded || categoryStore.loadError) {
        void loadCategories().catch(() => undefined);
      }
      void load(month).catch(() => undefined);
    },
  };
}
