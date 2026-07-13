import { SkeletonGroup } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, Radius, Size, Spacing, TouchSize, Type } from '@/constants/theme';

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
        <View
          testID="plans-summary-skeleton"
          className="border-border bg-surface mx-4 border"
          style={plansStyles.summary}
        >
          <SkeletonGroup.Item style={plansStyles.eyebrow} />
          <View style={plansStyles.primaryRow}>
            <SkeletonGroup.Item style={plansStyles.primaryValue} />
            <SkeletonGroup.Item style={plansStyles.attention} />
          </View>
          <View style={plansStyles.moneyRow}>
            <SkeletonGroup.Item style={plansStyles.moneyLabel} />
            <SkeletonGroup.Item style={plansStyles.percentage} />
          </View>
          <SkeletonGroup.Item style={plansStyles.progress} />
          <View style={plansStyles.metricsRow}>
            {[0, 1, 2].map((metric) => (
              <View key={metric} style={plansStyles.metric}>
                <SkeletonGroup.Item style={plansStyles.metricValue} />
                <SkeletonGroup.Item style={plansStyles.metricLabel} />
              </View>
            ))}
          </View>
          <View style={plansStyles.statusRow}>
            {[0, 1, 2, 3].map((status) => (
              <View key={status} style={plansStyles.statusItem}>
                <SkeletonGroup.Item style={plansStyles.statusIcon} />
                <SkeletonGroup.Item style={plansStyles.statusLabel} />
              </View>
            ))}
          </View>
        </View>

        <View className="mx-4" style={plansStyles.toolRail}>
          <SkeletonGroup.Item style={plansStyles.tool} />
        </View>

        <SkeletonGroup.Item className="mx-4" style={plansStyles.section} />
        {PLAN_ROWS.map((row) => (
          <View
            key={row}
            testID="plan-card-skeleton"
            className="border-border bg-surface mx-4 border"
            style={plansStyles.card}
          >
            <View style={plansStyles.cardHeader}>
              <View style={plansStyles.cardTitleWrap}>
                <View style={plansStyles.cardTitleRow}>
                  <SkeletonGroup.Item style={plansStyles.cardTitle} />
                  <SkeletonGroup.Item style={plansStyles.cardStatus} />
                </View>
                <SkeletonGroup.Item style={plansStyles.cardDate} />
              </View>
              <View style={plansStyles.cardBalanceWrap}>
                <SkeletonGroup.Item style={plansStyles.cardBalance} />
                <SkeletonGroup.Item style={plansStyles.cardBalanceMeta} />
              </View>
            </View>
            <View style={plansStyles.cardMoneyRow}>
              <SkeletonGroup.Item style={plansStyles.cardSpent} />
              <SkeletonGroup.Item style={plansStyles.cardPercentage} />
            </View>
            <SkeletonGroup.Item style={plansStyles.cardProgress} />
            <SkeletonGroup.Item style={plansStyles.cardPace} />
            <View style={plansStyles.cardChips}>
              <SkeletonGroup.Item style={plansStyles.cardChip} />
              <SkeletonGroup.Item style={plansStyles.cardChip} />
              <SkeletonGroup.Item style={plansStyles.cardChip} />
            </View>
            <View style={plansStyles.cardFooter}>
              <SkeletonGroup.Item style={plansStyles.cardFooterLabel} />
              <View style={plansStyles.cardActions}>
                <SkeletonGroup.Item style={plansStyles.cardAction} />
                <SkeletonGroup.Item style={plansStyles.cardAction} />
              </View>
            </View>
          </View>
        ))}
      </SkeletonGroup>
    </View>
  );
}

const plansStyles = StyleSheet.create({
  summary: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  eyebrow: {
    width: '38%',
    height: Type.micro,
    borderRadius: Radius.sm,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xxs,
  },
  primaryValue: { width: '45%', height: Type.headline, borderRadius: Radius.sm },
  attention: { width: '30%', height: Size.checkCircle, borderRadius: Radius.xl },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  moneyLabel: { width: '50%', height: Type.caption, borderRadius: Radius.sm },
  percentage: { width: '18%', height: Type.caption, borderRadius: Radius.sm },
  progress: {
    width: '100%',
    height: Size.progressTrack,
    marginTop: Spacing.xs,
    borderRadius: Radius.sm,
  },
  metricsRow: { flexDirection: 'row', height: Size.typeIconBox, marginTop: Spacing.md },
  metric: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xxxs },
  metricValue: { width: '68%', height: Type.caption, borderRadius: Radius.sm },
  metricLabel: { width: '45%', height: Type.micro, borderRadius: Radius.sm },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: Size.hairline,
    borderTopColor: Colors.dark.border,
  },
  statusItem: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  statusIcon: { width: Size.iconXs, height: Size.iconXs, borderRadius: Radius.xl },
  statusLabel: { width: '70%', height: Type.micro, borderRadius: Radius.sm },
  toolRail: { marginTop: Spacing.sm },
  tool: { width: '100%', height: Size.budgetToolHeight, borderRadius: Radius.md },
  section: {
    width: Spacing.xxl * 3,
    height: Type.micro,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    borderRadius: Radius.sm,
  },
  card: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cardHeader: {
    minHeight: TouchSize.min,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cardTitleWrap: { flex: 1, justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: { flex: 1, height: Type.body, borderRadius: Radius.sm },
  cardStatus: { width: Size.headerHeight, height: Size.checkCircle, borderRadius: Radius.xl },
  cardDate: { width: '72%', height: Type.micro, marginTop: Spacing.xxxs, borderRadius: Radius.sm },
  cardBalanceWrap: { alignItems: 'flex-end', gap: Spacing.xxxs },
  cardBalance: { width: Spacing.xxl * 2, height: Type.bodyStrong, borderRadius: Radius.sm },
  cardBalanceMeta: { width: Spacing.xl * 2, height: Type.micro, borderRadius: Radius.sm },
  cardMoneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  cardSpent: { width: '45%', height: Type.caption, borderRadius: Radius.sm },
  cardPercentage: { width: TouchSize.min, height: Type.micro, borderRadius: Radius.sm },
  cardProgress: {
    width: '100%',
    height: Spacing.xxs,
    marginTop: Spacing.xs,
    borderRadius: Radius.sm,
  },
  cardPace: { width: '32%', height: Type.micro, marginTop: Spacing.xs, borderRadius: Radius.sm },
  cardChips: { flexDirection: 'row', gap: Spacing.xxs, marginTop: Spacing.xs },
  cardChip: {
    width: Size.filterSegmentCompactWidth,
    height: Size.compactChipHeight,
    borderRadius: Radius.xl,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: Size.hairline,
    borderTopColor: Colors.dark.border,
  },
  cardFooterLabel: { width: '45%', height: Type.micro, borderRadius: Radius.sm },
  cardActions: { flexDirection: 'row', gap: Spacing.xxs },
  cardAction: { width: Spacing.xl, height: Spacing.xl, borderRadius: Radius.sm },
});
