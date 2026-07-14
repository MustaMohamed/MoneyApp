import { Card, SkeletonGroup } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';

const ROWS = [0, 1, 2, 3];
const PLAN_ROWS = [0, 1];

export function BudgetScreenSkeleton({
  variant = 'categories',
}: {
  variant?: 'categories' | 'plans';
}): React.ReactElement {
  if (variant === 'plans') return <PlansSkeleton />;

  return (
    <View testID="budget-screen-skeleton" accessibilityLabel={Strings.loadingBudgetA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        <View className="border-border bg-surface mx-4 mt-3 rounded-2xl border p-3">
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <SkeletonGroup.Item className="h-8 flex-1 rounded-md" />
            <SkeletonGroup.Item className="h-8 flex-1 rounded-md" />
            <SkeletonGroup.Item className="h-8 flex-1 rounded-md" />
          </View>
          <SkeletonGroup.Item className="mt-3 h-3 w-full rounded-full" />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} className="mt-2">
            <SkeletonGroup.Item className="h-3 w-12 rounded-md" />
            <SkeletonGroup.Item className="h-3 w-16 rounded-md" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.xs }} className="mx-4 mt-2">
          <SkeletonGroup.Item className="h-9 flex-1 rounded-lg" />
          <SkeletonGroup.Item className="h-9 flex-1 rounded-lg" />
          <SkeletonGroup.Item className="h-9 flex-1 rounded-lg" />
        </View>

        <SkeletonGroup.Item className="mx-4 mt-4 h-3 w-24 rounded-md" />
        {ROWS.map((row) => (
          <View
            key={row}
            testID="budget-row-skeleton"
            className="border-separator border-b px-4 py-2"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <SkeletonGroup.Item className="h-10 w-10 rounded-full" />
              <View style={{ flex: 1 }} className="gap-1.5">
                <SkeletonGroup.Item
                  className={row % 2 === 0 ? 'h-4 w-32 rounded-md' : 'h-4 w-24 rounded-md'}
                />
                <SkeletonGroup.Item className="h-3 w-12 rounded-md" />
              </View>
              <View style={{ alignItems: 'flex-end' }} className="gap-1.5">
                <SkeletonGroup.Item
                  className={row % 2 === 0 ? 'h-4 w-20 rounded-md' : 'h-4 w-16 rounded-md'}
                />
                <SkeletonGroup.Item className="h-3 w-24 rounded-md" />
              </View>
            </View>
          </View>
        ))}
      </SkeletonGroup>
    </View>
  );
}

function PlansSkeleton(): React.ReactElement {
  return (
    <View testID="budget-screen-skeleton" accessibilityLabel={Strings.loadingBudgetA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        <Card
          testID="plans-summary-skeleton"
          className="bg-surface border-border mx-4 rounded-xl border p-0 shadow-none"
        >
          <Card.Body className="px-2 py-1.5">
            <SkeletonGroup.Item className="h-[13px] w-[38%] rounded-lg" />
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <SkeletonGroup.Item className="h-[31px] w-[45%] rounded-lg" />
              <SkeletonGroup.Item className="h-7 w-[30%] rounded-full" />
            </View>
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <SkeletonGroup.Item className="h-[15px] w-1/2 rounded-lg" />
              <SkeletonGroup.Item className="h-[15px] w-[18%] rounded-lg" />
            </View>
            <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-full" />
            <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
              {[0, 1, 2].map((metric) => (
                <View key={metric} className="flex-1 items-center justify-center gap-0.5 px-1">
                  <SkeletonGroup.Item className="h-[11.5px] w-[45%] rounded-lg" />
                  <SkeletonGroup.Item className="h-[15px] w-[68%] rounded-lg" />
                </View>
              ))}
            </View>
            <View className="mt-1.5 flex-row items-center">
              {[0, 1, 2, 3].map((status) => (
                <View key={status} className="flex-1 flex-row items-center justify-center gap-0.5">
                  <SkeletonGroup.Item className="h-4 w-4 rounded-full" />
                  <SkeletonGroup.Item className="h-[13px] w-10 rounded-lg" />
                </View>
              ))}
            </View>
          </Card.Body>
        </Card>

        <View className="mx-4 mt-3">
          <SkeletonGroup.Item className="h-[38px] w-full rounded-lg" />
        </View>

        {PLAN_ROWS.map((row) => (
          <Card
            key={row}
            testID="plan-card-skeleton"
            variant="default"
            className="bg-surface border-border mx-4 mt-3 overflow-hidden rounded-lg border px-2 py-1.5"
          >
            <Card.Header className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <SkeletonGroup.Item
                    className={
                      row === 0 ? 'h-[19px] w-[52%] rounded-lg' : 'h-[19px] w-[40%] rounded-lg'
                    }
                  />
                  <SkeletonGroup.Item className="h-6 w-14 rounded-full" />
                </View>
                <SkeletonGroup.Item className="mt-0.5 h-[13px] w-[72%] rounded-lg" />
              </View>
              <View className="items-end gap-0.5">
                <SkeletonGroup.Item className="h-5 w-16 rounded-lg" />
                <SkeletonGroup.Item className="h-[11.5px] w-12 rounded-lg" />
              </View>
            </Card.Header>
            <Card.Body className="mt-1">
              <View className="flex-row items-center justify-between gap-3">
                <SkeletonGroup.Item className="h-[14px] w-[45%] rounded-lg" />
                <SkeletonGroup.Item className="h-[13px] w-14 rounded-lg" />
              </View>
              <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-full" />
              <SkeletonGroup.Item className="mt-0.5 h-[13px] w-[32%] rounded-lg" />
              <View className="mt-1 flex-row gap-1">
                {[0, 1, 2].map((chip) => (
                  <SkeletonGroup.Item key={chip} className="h-[30px] w-[84px] rounded-full" />
                ))}
              </View>
            </Card.Body>
            <Card.Footer className="border-border mt-1 flex-row items-center justify-between gap-3 border-t pt-0.5">
              <SkeletonGroup.Item className="h-[11.5px] w-[45%] rounded-lg" />
              <SkeletonGroup.Item
                testID="plan-card-action-skeleton"
                className="h-6 w-6 rounded-lg"
              />
            </Card.Footer>
          </Card>
        ))}
      </SkeletonGroup>
    </View>
  );
}
