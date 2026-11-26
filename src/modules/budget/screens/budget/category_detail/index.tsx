import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DetailHero } from '@/components/ui/detail_hero';
import { DetailLoadError } from '@/components/ui/detail_load_error';
import { DetailNotFoundState } from '@/components/ui/detail_not_found_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import {
  BUDGET_CATEGORY_DETAIL_HERO_TEST_ID,
  BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY,
  BUDGET_CATEGORY_DETAIL_LOAD_ERROR_TEST_ID,
  BUDGET_CATEGORY_DETAIL_NOT_FOUND_TEST_ID,
} from '@/modules/budget/screens/budget/category_detail/category_detail.helpers';
import { useCategoryDetail } from '@/modules/budget/screens/budget/category_detail/category_detail.hook';
import { CategoryBudgetsCard } from '@/modules/budget/screens/budget/category_detail/components/category_budgets_card';
import { CategoryDetailSkeleton } from '@/modules/budget/screens/budget/category_detail/components/category_detail_skeleton';
import { MonthlyResultChart } from '@/modules/budget/screens/budget/category_detail/components/monthly_result_chart';
import { ms } from '@/utils/responsive';

export default function CategoryBudgetDetailScreen() {
  const { state, goBack, retry } = useCategoryDetail();

  return (
    <Screen>
      <StackHeader title={Strings.budgetTitle} onBack={goBack} />

      {state.viewState === 'loading' ? (
        <CategoryDetailSkeleton />
      ) : state.viewState === 'notFound' ? (
        <DetailNotFoundState
          title={Strings.budgetCategoryDetailNotFoundTitle}
          body={Strings.budgetCategoryDetailNotFoundBody}
          testID={BUDGET_CATEGORY_DETAIL_NOT_FOUND_TEST_ID}
        />
      ) : state.viewState === 'firstLoadError' ? (
        <DetailLoadError
          copy={BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY}
          testID={BUDGET_CATEGORY_DETAIL_LOAD_ERROR_TEST_ID}
          onRetry={retry}
        />
      ) : (
        <>
          <ScreenScroll contentContainerStyle={styles.content}>
            {state.hero && (
              <DetailHero hero={state.hero} testID={BUDGET_CATEGORY_DETAIL_HERO_TEST_ID} />
            )}
            <View style={styles.chart}>
              <MonthlyResultChart history={state.history} month={state.month} />
            </View>
            {state.budgetsCard && <CategoryBudgetsCard card={state.budgetsCard} />}
          </ScreenScroll>

          {state.viewState === 'refreshErrorWithData' ? (
            <DetailLoadError
              copy={BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY}
              testID={BUDGET_CATEGORY_DETAIL_LOAD_ERROR_TEST_ID}
              floating
              onRetry={retry}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: ms(96) },
  chart: { paddingHorizontal: Spacing.md },
});
