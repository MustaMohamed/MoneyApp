import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, Surface } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type { SpendingPlanDetailVM } from '@/modules/budget/screens/budget/spending_plans.helpers';

interface SpendingPlanDetailSummaryProps {
  detail: SpendingPlanDetailVM;
}

export function SpendingPlanDetailSummary({ detail }: SpendingPlanDetailSummaryProps) {
  return (
    <Surface variant="transparent" style={styles.surface}>
      <View style={styles.body}>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={detail.balanceAccessibilityLabel}
            >
              <Text style={[styles.balance, { color: detail.balanceColor }]}>
                {detail.balanceAmountLabel}
                <Text style={styles.balanceMeta}> {detail.balanceMetaLabel}</Text>
              </Text>
            </View>
            <Text style={styles.date}>{detail.dateLabel}</Text>
          </View>
          <Chip
            size="sm"
            variant="soft"
            color={detail.statusTone}
            animation="disable-all"
            accessibilityRole="text"
            accessibilityLabel={detail.statusLabel}
            style={styles.statusChip}
          >
            <Chip.Label style={styles.statusLabel}>{detail.statusLabel}</Chip.Label>
          </Chip>
        </View>

        <View style={styles.moneyRow}>
          <Text style={styles.spent}>{detail.spentLabel}</Text>
          <Text style={styles.percentage}>{detail.percentageLabel}</Text>
        </View>

        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={detail.percentageLabel}
          accessibilityValue={{ min: 0, max: 100, now: detail.progressPercentage }}
          style={styles.progressWrap}
        >
          <BudgetBar
            pct={detail.pct}
            status={detail.progressStatus}
            color={detail.progressColor}
            height={Size.spendingPlanProgressTrack}
          />
          {detail.elapsedMarkerPercentage !== undefined &&
          detail.elapsedMarkerColor !== undefined ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={[
                styles.elapsedMarker,
                {
                  left: `${detail.elapsedMarkerPercentage}%`,
                  backgroundColor: detail.elapsedMarkerColor,
                },
              ]}
            />
          ) : null}
        </View>

        <View style={styles.metrics}>
          {detail.metrics.map((metric, index) => (
            <React.Fragment key={metric.label}>
              {index > 0 ? <View style={styles.metricDivider} /> : null}
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {detail.insights.length > 0 ? (
          <View style={styles.insights}>
            {detail.insights.map((insight) => (
              <View key={insight.key} style={styles.insight}>
                <MaterialCommunityIcons
                  accessible={false}
                  name={insight.icon}
                  size={Size.iconXs}
                  color={insight.color}
                />
                <Text style={styles.insightLabel} numberOfLines={2}>
                  {insight.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderBottomWidth: Size.hairline,
    borderBottomColor: Colors.dark.border,
  },
  body: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroCopy: { flex: 1 },
  date: {
    marginTop: Spacing.xxxs,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.chip,
    color: Colors.dark.text2,
  },
  balance: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
  },
  balanceMeta: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.chip,
    color: Colors.dark.text2,
  },
  statusChip: {
    minHeight: Size.spendingPlanStatusHeight,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: 0,
  },
  statusLabel: { fontFamily: FontFamily.interSemi, fontSize: Type.chipMeta },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  spent: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
  percentage: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  progressWrap: {
    position: 'relative',
    justifyContent: 'center',
    marginTop: Spacing.xxs,
  },
  elapsedMarker: {
    position: 'absolute',
    top: -Spacing.xxxs,
    width: Spacing.xxxs,
    height: Spacing.sm,
    borderRadius: Radius.sm,
    transform: [{ translateX: -Spacing.xxxs }],
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: Size.hairline,
    borderTopColor: Colors.dark.border,
  },
  metric: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xxxs },
  metricDivider: { width: Size.hairline, backgroundColor: Colors.dark.border },
  metricValue: {
    marginTop: Spacing.xxxs,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  metricLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.chipMeta,
    color: Colors.dark.text2,
    textAlign: 'center',
  },
  insights: {
    flexDirection: 'row',
    gap: Spacing.xxs,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: Size.hairline,
    borderTopColor: Colors.dark.border,
  },
  insight: {
    minHeight: Spacing.xxl,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.dark.surfaceEl,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  insightLabel: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.chip,
    color: Colors.dark.text2,
  },
});
