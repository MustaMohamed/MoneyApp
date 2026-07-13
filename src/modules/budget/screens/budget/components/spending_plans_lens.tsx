import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
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
  onOpenDetails?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (plan: { id: string; name: string }) => void;
}

export function SpendingPlansLens({
  rows,
  summary,
  summaryFooter,
  onCreate,
  onOpenDetails,
  onEdit,
  onDelete,
}: SpendingPlansLensProps) {
  return (
    <View>
      <View style={styles.summaryCluster}>
        <SpendingPlansSummary summary={summary} />
        {summaryFooter}
      </View>

      {rows.length > 0 ? (
        <>
          {rows.map((row) => (
            <SpendingPlanCard
              key={row.id}
              row={row}
              onOpenDetails={onOpenDetails ?? onEdit}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons
              name="calendar-star"
              size={Spacing.xxl}
              color={Colors.dark.text2}
            />
          </View>
          <Text style={styles.emptyTitle}>{Strings.budgetPlansEmptyTitle}</Text>
          <Text style={styles.emptyBody}>{Strings.budgetPlansEmptyBody}</Text>
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

const styles = StyleSheet.create({
  summaryCluster: {
    paddingHorizontal: Spacing.md,
  },
  empty: {
    minHeight: Size.plansEmptyMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: Size.plansEmptyIcon,
    height: Size.plansEmptyIcon,
    borderRadius: Size.plansEmptyIcon / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surface,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: Spacing.xs,
    maxWidth: Size.plansEmptyTextWidth,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    lineHeight: Size.compactBodyLineHeight,
    color: Colors.dark.text2,
    textAlign: 'center',
  },
});
