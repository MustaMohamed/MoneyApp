import React from 'react';
import { StyleSheet } from 'react-native';

import { DetailLoadError } from '@/components/ui/detail_load_error';
import { DetailNotFoundState } from '@/components/ui/detail_not_found_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import {
  BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY,
  BUDGET_CATEGORY_DETAIL_LOAD_ERROR_TEST_ID,
  BUDGET_CATEGORY_DETAIL_NOT_FOUND_TEST_ID,
} from '@/modules/budget/screens/budget/category_detail/category_detail.helpers';
import { useCategoryDetail } from '@/modules/budget/screens/budget/category_detail/category_detail.hook';
import { CategoryDetailSkeleton } from '@/modules/budget/screens/budget/category_detail/components/category_detail_skeleton';
import { LiveMonthCard } from '@/modules/budget/screens/budget/category_detail/components/live_month_card';
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
            {state.liveMonth && (
              <LiveMonthCard
                result={state.liveMonth}
                daysLeft={state.daysLeft}
                color={state.color}
              />
            )}
            {state.history.results.length > 0 && (
              <MonthlyResultChart history={state.history} month={state.month} />
            )}
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
  content: { paddingHorizontal: Spacing.md, paddingBottom: ms(96) },
});
