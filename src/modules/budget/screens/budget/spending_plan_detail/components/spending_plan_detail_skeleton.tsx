import { SkeletonGroup } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius, Size, Spacing, Type } from '@/constants/theme';

const CATEGORY_ROWS = [0, 1, 2];

export function SpendingPlanDetailSkeleton(): React.ReactElement {
  return (
    <SkeletonGroup isLoading isSkeletonOnly>
      <View style={styles.summary}>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <SkeletonGroup.Item style={styles.balance} />
            <SkeletonGroup.Item style={styles.date} />
          </View>
          <SkeletonGroup.Item style={styles.status} />
        </View>
        <View style={styles.moneyRow}>
          <SkeletonGroup.Item style={styles.spent} />
          <SkeletonGroup.Item style={styles.percentage} />
        </View>
        <SkeletonGroup.Item style={styles.progress} />
        <View style={styles.metrics}>
          {[0, 1, 2, 3].map((metric) => (
            <SkeletonGroup.Item key={metric} style={styles.metric} />
          ))}
        </View>
      </View>
      <View style={styles.insights}>
        <SkeletonGroup.Item style={styles.insight} />
        <SkeletonGroup.Item style={styles.insight} />
      </View>
      <View style={styles.sectionRow}>
        <SkeletonGroup.Item style={styles.sectionLabel} />
        <SkeletonGroup.Item style={styles.sectionAmount} />
      </View>
      {CATEGORY_ROWS.map((row) => (
        <View key={row} style={styles.categoryRow}>
          <SkeletonGroup.Item style={styles.categoryIcon} />
          <View style={styles.categoryCopy}>
            <SkeletonGroup.Item style={styles.categoryName} />
            <SkeletonGroup.Item style={styles.categoryMeta} />
          </View>
          <SkeletonGroup.Item style={styles.categoryAmount} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  summary: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  heroCopy: { flex: 1, gap: Spacing.xxs },
  balance: { width: '55%', height: Type.headline, borderRadius: Radius.sm },
  date: { width: '68%', height: Type.chip, borderRadius: Radius.sm },
  status: { width: Spacing.xxl * 2, height: Size.checkCircle, borderRadius: Radius.xl },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  spent: { width: '45%', height: Type.micro, borderRadius: Radius.sm },
  percentage: { width: '20%', height: Type.micro, borderRadius: Radius.sm },
  progress: {
    width: '100%',
    height: Size.spendingPlanProgressTrack,
    marginTop: Spacing.xxs,
    borderRadius: Radius.sm,
  },
  metrics: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  metric: { flex: 1, height: Spacing.xl, borderRadius: Radius.sm },
  insights: { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.md },
  insight: { flex: 1, height: Spacing.xxl, borderRadius: Radius.sm },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionLabel: { width: Spacing.xxl * 2.5, height: Type.micro, borderRadius: Radius.sm },
  sectionAmount: { width: Spacing.xxl * 2, height: Type.micro, borderRadius: Radius.sm },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  categoryIcon: {
    width: Size.typeIconBox,
    height: Size.typeIconBox,
    borderRadius: Radius.xl,
  },
  categoryCopy: { flex: 1, gap: Spacing.xxs },
  categoryName: { width: '65%', height: Type.caption, borderRadius: Radius.sm },
  categoryMeta: { width: '50%', height: Type.chip, borderRadius: Radius.sm },
  categoryAmount: { width: Spacing.xxl * 2, height: Type.caption, borderRadius: Radius.sm },
});
