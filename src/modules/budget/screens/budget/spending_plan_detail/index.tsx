import React from 'react';
import { View } from 'react-native';

import { DetailEditAction } from '@/components/ui/detail_edit_action';
import { DetailHero } from '@/components/ui/detail_hero';
import { DetailLoadError } from '@/components/ui/detail_load_error';
import { DetailNotFoundState } from '@/components/ui/detail_not_found_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { SpendingPlanDetailActions } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_actions';
import { SpendingPlanDetailFlexibleCard } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_flexible_card';
import { SpendingPlanDetailLimitsCard } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_limits_card';
import { SpendingPlanDetailSkeleton } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_skeleton';
import { SpendingPlanSpendingCard } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_spending_card';
import {
  SPENDING_PLAN_DETAIL_HERO_TEST_ID,
  SPENDING_PLAN_DETAIL_LOAD_ERROR_COPY,
  SPENDING_PLAN_DETAIL_LOAD_ERROR_TEST_ID,
} from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.helpers';
import { useSpendingPlanDetail } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook';
import { SpendingPlanSheet } from '@/modules/budget/screens/budget/spending_plan_sheet';

export default function SpendingPlanDetailScreen() {
  const { state, goBack, editPlan, openTransaction, retry, reload } = useSpendingPlanDetail();
  const plan = state.plan;

  return (
    <Screen>
      <StackHeader
        title={Strings.budgetPlansDetailTitle}
        onBack={goBack}
        right={
          state.showsBody && plan ? (
            <DetailEditAction
              accessibilityLabel={Strings.budgetPlansDetailEditAccessibility}
              onPress={editPlan}
            />
          ) : undefined
        }
      />

      {state.viewState === 'loading' ? (
        <ScreenScroll>
          <View className="pb-6">
            <SpendingPlanDetailSkeleton />
          </View>
        </ScreenScroll>
      ) : null}

      {state.viewState === 'notFound' ? (
        <DetailNotFoundState
          title={Strings.budgetPlansDetailNotFoundTitle}
          body={Strings.budgetPlansDetailNotFoundBody}
          testID="spending-plan-detail-not-found"
        />
      ) : null}

      {state.viewState === 'firstLoadError' ? (
        <DetailLoadError
          copy={SPENDING_PLAN_DETAIL_LOAD_ERROR_COPY}
          testID={SPENDING_PLAN_DETAIL_LOAD_ERROR_TEST_ID}
          onRetry={retry}
        />
      ) : null}

      {state.showsBody && plan ? (
        <>
          <ScreenScroll showsVerticalScrollIndicator={false}>
            <View className="pb-6">
              <DetailHero hero={plan.detail.hero} testID={SPENDING_PLAN_DETAIL_HERO_TEST_ID} />

              {plan.detail.limitsCard ? (
                <SpendingPlanDetailLimitsCard card={plan.detail.limitsCard} />
              ) : null}
              {plan.detail.flexibleCard ? (
                <SpendingPlanDetailFlexibleCard card={plan.detail.flexibleCard} />
              ) : null}
              {state.spendingCard ? (
                <SpendingPlanSpendingCard card={state.spendingCard} onRowPress={openTransaction} />
              ) : null}
              <SpendingPlanDetailActions onEdit={editPlan} />
            </View>
          </ScreenScroll>
          <SpendingPlanSheet
            budgetableCategories={state.budgetableCategories}
            editingPlan={plan}
            owner="planDetail"
            onSaved={reload}
          />
        </>
      ) : null}

      {state.viewState === 'refreshErrorWithData' ? (
        <DetailLoadError
          copy={SPENDING_PLAN_DETAIL_LOAD_ERROR_COPY}
          testID={SPENDING_PLAN_DETAIL_LOAD_ERROR_TEST_ID}
          floating
          onRetry={retry}
        />
      ) : null}
    </Screen>
  );
}
