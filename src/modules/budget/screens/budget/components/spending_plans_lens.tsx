import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { SpendingPlanCard } from '@/modules/budget/screens/budget/components/spending_plan_card';
import { SpendingPlansSummary } from '@/modules/budget/screens/budget/components/spending_plans_summary';
import type {
  SpendingPlanRowVM,
  SpendingPlansSummaryVM,
} from '@/modules/budget/screens/budget/spending_plans.types';

interface SpendingPlansLensProps {
  rows: SpendingPlanRowVM[];
  summary: SpendingPlansSummaryVM;
  summaryFooter?: React.ReactNode;
  onCreate: () => void;
  onOpenDetails: (id: string) => void;
  onDelete: (plan: { id: string; name: string }) => void;
}

export function SpendingPlansLens({
  rows,
  summary,
  summaryFooter,
  onCreate,
  onOpenDetails,
  onDelete,
}: SpendingPlansLensProps) {
  return (
    <View>
      <View className="mt-3 px-4">
        <SpendingPlansSummary summary={summary} />
        {summaryFooter}
      </View>

      {rows.length > 0 ? (
        <>
          {rows.map((row) => (
            <SpendingPlanCard
              key={row.id}
              row={row}
              onOpenDetails={onOpenDetails}
              onDelete={onDelete}
            />
          ))}
        </>
      ) : (
        <View className="min-h-[300px] items-center justify-center px-6">
          <View className="bg-surface h-[72px] w-[72px] items-center justify-center rounded-full">
            <MaterialCommunityIcons
              name="calendar-star"
              size={Spacing.xxl}
              color={Colors.dark.text2}
            />
          </View>
          <Text className="font-sora text-foreground mt-4 text-center text-[18px] font-semibold">
            {Strings.budgetPlansEmptyTitle}
          </Text>
          <Text className="font-inter text-muted mt-2 max-w-[280px] text-center text-[14px] leading-5 font-medium">
            {Strings.budgetPlansEmptyBody}
          </Text>
          <Button
            variant="primary"
            size="sm"
            label={Strings.budgetPlansCreateAction}
            accessibilityLabel={Strings.budgetPlansCreateAction}
            onPress={onCreate}
            className="mt-4 self-center px-4"
          />
        </View>
      )}
    </View>
  );
}
