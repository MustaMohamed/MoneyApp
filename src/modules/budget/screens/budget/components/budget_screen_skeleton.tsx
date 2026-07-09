import { SkeletonGroup } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';

const ROWS = [0, 1, 2, 3];

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
        <View className="border-border bg-surface mx-4 mt-3 rounded-2xl border p-3">
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <SkeletonGroup.Item className="h-8 flex-1 rounded-md" />
            <SkeletonGroup.Item className="h-8 flex-1 rounded-md" />
            <SkeletonGroup.Item className="h-8 flex-1 rounded-md" />
          </View>
          <SkeletonGroup.Item className="mt-3 h-2.5 w-full rounded-full" />
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.xs }} className="mx-4 mt-2">
          <SkeletonGroup.Item className="h-9 flex-1 rounded-lg" />
          <SkeletonGroup.Item className="h-9 flex-1 rounded-lg" />
          <SkeletonGroup.Item className="h-9 flex-1 rounded-lg" />
        </View>

        <SkeletonGroup.Item className="mx-4 mt-4 h-3 w-24 rounded-md" />
        {[0, 1].map((row) => (
          <View key={row} className="border-border bg-surface mx-4 mt-2 rounded-2xl border p-3">
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm }}
            >
              <View style={{ flex: 1 }} className="gap-1.5">
                <SkeletonGroup.Item className="h-4 w-36 rounded-md" />
                <SkeletonGroup.Item className="h-3 w-44 rounded-md" />
              </View>
              <View style={{ alignItems: 'flex-end' }} className="gap-1.5">
                <SkeletonGroup.Item className="h-4 w-20 rounded-md" />
                <SkeletonGroup.Item className="h-3 w-10 rounded-md" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.xs }} className="mt-3">
              <SkeletonGroup.Item className="h-6 w-20 rounded-full" />
              <SkeletonGroup.Item className="h-6 w-24 rounded-full" />
            </View>
            <SkeletonGroup.Item className="mt-3 h-2 w-full rounded-full" />
            <View className="mt-3 gap-1.5">
              <SkeletonGroup.Item className="h-3 w-full rounded-md" />
              <SkeletonGroup.Item className="h-1.5 w-full rounded-full" />
            </View>
          </View>
        ))}
      </SkeletonGroup>
    </View>
  );
}
