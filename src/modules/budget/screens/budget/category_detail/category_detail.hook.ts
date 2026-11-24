import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Colors } from '@/constants/theme';
import { currentYearMonth, lastMonths } from '@/modules/budget/repositories/budget.repository';
import {
  type CategoryMonthVM,
  type MonthResultVM,
  computeCategoryHistory,
  computeStatus,
  resolveLimitForMonth,
} from '@/modules/budget/screens/budget/budget.helpers';
import { resolveCategoryDetailViewState } from '@/modules/budget/screens/budget/category_detail/category_detail.helpers';
import { useCategoryDetailState } from '@/modules/budget/screens/budget/category_detail/category_detail.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

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
  const currentMonth = currentYearMonth();
  const month = validRouteMonth ?? (storedMonth === currentMonth ? storedMonth : currentMonth);

  const { categories, categoriesLoaded, categoryLoadError } = useCategoryStore(
    useShallow((s) => ({
      categories: s.categories,
      categoriesLoaded: s.hasLoaded,
      categoryLoadError: s.loadError,
    })),
  );
  const loadCategories = useCategoryStore.getState().loadCategories;
  const { budgetRows, spendByMonth, budgetLoaded, loadedMonth, loadError } = useBudgetStore(
    useShallow((s) => ({
      budgetRows: s.rows,
      spendByMonth: s.spendByMonth,
      budgetLoaded: s.loaded,
      loadedMonth: s.loadedMonth,
      loadError: s.loadError,
    })),
  );
  const load = useBudgetStore.getState().load;

  useFocusEffect(
    useCallback(() => {
      const selectedMonth = validRouteMonth ?? currentYearMonth();
      setMonth(selectedMonth);
      const categoryStore = useCategoryStore.getState();
      if (!categoryStore.hasLoaded || categoryStore.loadError) {
        void loadCategories().catch(() => undefined);
      }
      void load(selectedMonth).catch(() => undefined);
    }, [loadCategories, load, setMonth, validRouteMonth]),
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
    const actualCurrentMonth = currentYearMonth();
    const out: CategoryMonthVM[] = [];
    for (const ym of months) {
      const limit = resolveLimitForMonth(budgetRows, id, ym);
      if (limit === null && ym !== month) continue; // only months the budget was active, and the selected one
      const spent = spendByMonth[id]?.[ym] ?? 0;
      const lifecycle =
        ym < actualCurrentMonth
          ? 'completed'
          : ym === actualCurrentMonth
            ? 'provisional'
            : 'planned';
      const isProvisional = lifecycle === 'provisional';
      out.push(
        limit === null
          ? {
              yearMonth: ym,
              spent,
              isProvisional,
              lifecycle,
              limit: undefined,
              delta: undefined,
              status: undefined,
            }
          : {
              yearMonth: ym,
              limit,
              spent,
              delta: limit - spent,
              status: computeStatus(spent, limit),
              isProvisional,
              lifecycle,
            },
      );
    }
    return out;
  }, [budgetRows, hasLoaded, id, month, spendByMonth]);

  const history = useMemo(() => computeCategoryHistory(results), [results]);
  const liveMonth = useMemo(
    () => results.find((r): r is MonthResultVM => r.yearMonth === month && r.limit !== undefined),
    [results, month],
  );

  const daysLeft = useMemo(() => {
    if (month !== currentYearMonth()) return undefined;
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const today = new Date();
    return Math.max(0, lastDay - today.getDate());
  }, [month]);

  return {
    state: {
      color: category?.color ?? Colors.dark.text2,
      liveMonth,
      history,
      daysLeft,
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
