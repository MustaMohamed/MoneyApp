import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
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
    <Card className="p-0 shadow-none" style={styles.card}>
      <Card.Body style={styles.body}>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.date}>{detail.dateLabel}</Text>
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={detail.balanceAccessibilityLabel}
            >
              <Text style={[styles.balance, { color: detail.balanceColor }]}>
                {detail.balanceAmountLabel}
              </Text>
              <Text style={styles.balanceMeta}>{detail.balanceMetaLabel}</Text>
            </View>
          </View>
          <View style={styles.usage}>
            <Text style={styles.spent}>{detail.spentLabel}</Text>
            <Text style={styles.percentage}>{detail.percentageLabel}</Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <BudgetBar
            pct={detail.pct}
            status={detail.progressStatus}
            color={detail.progressColor}
            height={Size.progressTrack}
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
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
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
      </Card.Body>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: Size.hairline,
    borderColor: Colors.dark.border,
  },
  body: { padding: Spacing.md },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroCopy: { flex: 1 },
  date: {
    marginBottom: Spacing.xxs,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  balance: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
  },
  balanceMeta: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  usage: { alignItems: 'flex-end', paddingTop: Spacing.xxs },
  spent: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  percentage: {
    marginTop: Spacing.xxs,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  progressWrap: {
    position: 'relative',
    justifyContent: 'center',
    marginTop: Spacing.sm,
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
    marginTop: Spacing.md,
  },
  metric: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xxxs },
  metricDivider: { width: Size.hairline, backgroundColor: Colors.dark.border },
  metricValue: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  metricLabel: {
    marginTop: Spacing.xxxs,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textAlign: 'center',
  },
  insights: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: Size.hairline,
    borderTopColor: Colors.dark.border,
  },
  insight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  insightLabel: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
});
