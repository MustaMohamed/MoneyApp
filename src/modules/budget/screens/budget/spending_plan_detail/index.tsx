import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { DetailEditAction } from '@/components/ui/detail_edit_action';
import { DetailLoadError } from '@/components/ui/detail_load_error';
import { DetailNotFoundState } from '@/components/ui/detail_not_found_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import { SpendingPlanDetailActions } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_actions';
import { SpendingPlanDetailCategoryRow } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_category_row';
import { SpendingPlanDetailLimitsCard } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_limits_card';
import { SpendingPlanDetailSkeleton } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_skeleton';
import { SpendingPlanDetailSummary } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_summary';
import {
  SPENDING_PLAN_DETAIL_LOAD_ERROR_COPY,
  SPENDING_PLAN_DETAIL_LOAD_ERROR_TEST_ID,
} from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.helpers';
import { useSpendingPlanDetail } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook';
import { SpendingPlanSheet } from '@/modules/budget/screens/budget/spending_plan_sheet';

export default function SpendingPlanDetailScreen() {
  const { state, goBack, editPlan, retry, reload } = useSpendingPlanDetail();
  const plan = state.plan;

  return (
    <Screen>
      <StackHeader
        title={plan?.name ?? Strings.budgetPlansDetailTitle}
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
              <SpendingPlanDetailSummary detail={plan.detail} />

              {plan.detail.limitsCard ? (
                <SpendingPlanDetailLimitsCard card={plan.detail.limitsCard} />
              ) : null}
              <View className="mt-1 px-4">
                {plan.detail.categoryRows.map((row) => (
                  <SpendingPlanDetailCategoryRow key={row.categoryId} row={row} />
                ))}
                {plan.detail.flexibleRow ? (
                  <View className="border-border min-h-[52px] flex-row items-center gap-2 border-t">
                    <MaterialCommunityIcons
                      accessible={false}
                      name="wallet-outline"
                      size={Size.iconXs}
                      color={Colors.dark.gold}
                    />
                    <Text className="font-inter-medium text-content-secondary flex-1 text-[14px]">
                      {plan.detail.flexibleRow.label}
                    </Text>
                    <Text className="font-sora-semibold text-foreground text-[15px]">
                      {plan.detail.flexibleRow.amountLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
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
