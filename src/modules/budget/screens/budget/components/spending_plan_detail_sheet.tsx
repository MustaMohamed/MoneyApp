import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { budgetBandColor } from '@/modules/budget/screens/budget/budget.helpers';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { formatAmount } from '@/utils/format_amount';
import { formatShortDate } from '@/utils/format_date';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

interface SpendingPlanDetailSheetProps {
  isOpen: boolean;
  plan?: SpendingPlanRowVM;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
}

export function SpendingPlanDetailSheet({
  isOpen,
  plan,
  onOpenChange,
  onEdit,
}: SpendingPlanDetailSheetProps) {
  const bandColor = plan?.isOver ? Colors.dark.negative : budgetBandColor(plan?.pct ?? 0);
  const leftColor = (plan?.left ?? 0) < 0 ? Colors.dark.negative : Colors.dark.positive;

  return (
    <Sheet
      isOpen={isOpen && plan !== undefined}
      onOpenChange={onOpenChange}
      title={plan?.name ?? Strings.budgetPlansTitle}
      size="md"
      scrollable
      footer={
        plan ? (
          <Button
            variant="primary"
            label={Strings.budgetPlanEditTitle}
            onPress={() => onEdit(plan.id)}
          />
        ) : undefined
      }
    >
      {plan ? (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bodyContent}
        >
          <View style={styles.summary}>
            <Metric label={Strings.budgetPlanAmountLabel} value={formatAmount(plan.totalAmount)} />
            <View style={styles.sep} />
            <Metric label={Strings.budgetPlansSummarySpent} value={formatAmount(plan.spent)} />
            <View style={styles.sep} />
            <Metric
              label={Strings.budgetPlansSummaryLeft}
              value={formatAmount(plan.left)}
              color={leftColor}
            />
          </View>
          <BudgetBar pct={plan.pct} status="under" color={bandColor} height={ms(8)} />

          <Text style={styles.dateText}>
            {Strings.budgetPlansDateRange(
              formatShortDate(plan.startDate),
              formatShortDate(plan.endDate),
            )}
          </Text>

          <Text style={styles.section}>{Strings.budgetPlanCategories}</Text>
          <View style={styles.chips}>
            {plan.categoryChips.map((category) => (
              <View key={category.id} style={styles.chip}>
                <MaterialCommunityIcons
                  name={toIconName(category.icon, 'tag')}
                  size={ms(11)}
                  color={category.color}
                />
                <Text style={styles.chipText}>{category.name}</Text>
              </View>
            ))}
          </View>

          {plan.allocationRows.length > 0 ? (
            <>
              <Text style={styles.section}>{Strings.budgetPlanAllocateByCategory}</Text>
              <View style={styles.allocations}>
                {plan.allocationRows.map((allocation) => (
                  <View key={allocation.categoryId} style={styles.allocation}>
                    <View style={styles.allocationTop}>
                      <Text style={styles.allocationName}>{allocation.categoryName}</Text>
                      <Text style={[styles.allocationValue, allocation.isOver && styles.negative]}>
                        {formatAmount(allocation.spent)} /{' '}
                        {formatAmount(allocation.allocatedAmount)}
                      </Text>
                    </View>
                    <BudgetBar
                      pct={allocation.pct}
                      status="under"
                      color={
                        allocation.isOver ? Colors.dark.negative : budgetBandColor(allocation.pct)
                      }
                      height={ms(5)}
                    />
                  </View>
                ))}
                {plan.buffer > 0 ? (
                  <Text style={styles.buffer}>
                    {Strings.budgetPlansAllocationBuffer(formatAmount(plan.buffer))}
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}
        </BottomSheetScrollView>
      ) : null}
    </Sheet>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: SHEET_FOOTER_CLEARANCE,
  },
  summary: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.bg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  metricValue: {
    marginTop: ms(4),
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  sep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.border,
  },
  dateText: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  section: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: Spacing.xs,
    paddingVertical: ms(4),
  },
  chipText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
  allocations: {
    gap: Spacing.xs,
  },
  allocation: {
    gap: ms(4),
  },
  allocationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  allocationName: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  allocationValue: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
  negative: { color: Colors.dark.negative },
  buffer: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
});
