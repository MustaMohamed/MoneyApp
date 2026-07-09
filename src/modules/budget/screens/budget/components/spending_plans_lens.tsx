import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { budgetBandColor } from '@/modules/budget/screens/budget/budget.helpers';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import { SpendingPlanCard } from '@/modules/budget/screens/budget/components/spending_plan_card';
import type {
  SpendingPlanRowVM,
  SpendingPlansSummaryVM,
} from '@/modules/budget/screens/budget/spending_plans.helpers';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

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
  const leftColor = summary.left < 0 ? Colors.dark.negative : Colors.dark.positive;
  const bandColor = summary.left < 0 ? Colors.dark.negative : budgetBandColor(summary.pct);

  return (
    <View>
      <View style={styles.summaryCluster}>
        <View style={styles.summary}>
          <View style={styles.figures}>
            <Figure
              label={Strings.budgetPlansSummaryPlanned}
              value={formatAmount(summary.planned)}
            />
            <View style={styles.sep} />
            <Figure label={Strings.budgetPlansSummarySpent} value={formatAmount(summary.spent)} />
            <View style={styles.sep} />
            <Figure
              label={Strings.budgetPlansSummaryLeft}
              value={formatAmount(summary.left)}
              color={leftColor}
            />
          </View>
          <BudgetBar pct={summary.pct} status="under" color={bandColor} height={ms(10)} />
        </View>
        {summaryFooter}
      </View>

      {rows.length > 0 ? (
        <>
          <Text style={styles.section}>{Strings.budgetPlansTitle}</Text>
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
            <MaterialCommunityIcons name="calendar-star" size={ms(32)} color={Colors.dark.text2} />
          </View>
          <Text style={styles.emptyTitle}>{Strings.budgetPlansEmptyTitle}</Text>
          <Text style={styles.emptyBody}>{Strings.budgetPlansEmptyBody}</Text>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={Strings.budgetPlansCreateAction}
            onPress={onCreate}
            style={styles.emptyAction}
          >
            <Text style={styles.emptyActionText}>{Strings.budgetPlansCreateAction}</Text>
          </PressableFeedback>
        </View>
      )}
    </View>
  );
}

function Figure({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCluster: {
    paddingHorizontal: Spacing.md,
  },
  summary: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    padding: Spacing.md,
  },
  figures: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  figure: {
    flex: 1,
    alignItems: 'center',
  },
  sep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.border,
  },
  figureLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  figureValue: {
    marginTop: ms(4),
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  section: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  empty: {
    minHeight: ms(300),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: ms(72),
    height: ms(72),
    borderRadius: ms(36),
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
    maxWidth: ms(280),
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    lineHeight: ms(20),
    color: Colors.dark.text2,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.dark.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  emptyActionText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.bg,
  },
});
