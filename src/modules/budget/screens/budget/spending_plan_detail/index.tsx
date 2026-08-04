import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import { SpendingPlanDetailCategoryRow } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_category_row';
import { SpendingPlanDetailSkeleton } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_skeleton';
import { SpendingPlanDetailSummary } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_summary';
import { useSpendingPlanDetail } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook';
import { SpendingPlanSheet } from '@/modules/budget/screens/budget/spending_plan_sheet';

export default function SpendingPlanDetailScreen() {
  const { state, goBack, editPlan, retry } = useSpendingPlanDetail();
  const plan = state.plan;

  return (
    <Screen>
      <StackHeader
        title={plan?.name ?? Strings.budgetPlansDetailTitle}
        onBack={goBack}
        right={
          state.viewState === 'ready' && plan ? (
            <PressableFeedback
              accessibilityRole="button"
              accessibilityLabel={`${Strings.budgetPlanEditTitle} ${plan.name}`}
              onPress={editPlan}
              className="bg-surface border-border h-9 w-9 items-center justify-center rounded-[8px] border"
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={Size.iconSm}
                color={Colors.dark.gold}
              />
            </PressableFeedback>
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
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="font-sora-semibold text-muted text-center text-[14px]">
            {Strings.budgetPlansDetailNotFound}
          </Text>
          <Button
            variant="secondary"
            size="sm"
            label={Strings.budgetPlansDetailBack}
            accessibilityLabel={Strings.budgetPlansDetailBack}
            onPress={goBack}
          />
        </View>
      ) : null}

      {state.viewState === 'error' ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="font-sora-semibold text-muted text-center text-[14px]">
            {state.errorMessage}
          </Text>
          <Button
            variant="secondary"
            size="sm"
            label={Strings.budgetPlansDetailRetry}
            onPress={() => void retry()}
          />
        </View>
      ) : null}

      {state.viewState === 'ready' && plan ? (
        <>
          <ScreenScroll showsVerticalScrollIndicator={false}>
            <View className="pb-6">
              <SpendingPlanDetailSummary detail={plan.detail} />

              <View className="mt-3 flex-row items-center justify-between gap-3 px-4">
                <Text className="font-inter-semibold text-content-secondary text-[13px] uppercase">
                  {Strings.budgetPlansDetailCategories}
                </Text>
                <Text className="font-inter-medium text-content-secondary text-[13px]">
                  {plan.detail.totalSpentLabel}
                </Text>
              </View>
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
            </View>
          </ScreenScroll>
          <SpendingPlanSheet
            budgetableCategories={state.budgetableCategories}
            editingPlan={plan}
            onSaved={retry}
          />
        </>
      ) : null}
    </Screen>
  );
}
