import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { BudgetStatus } from '@/screens/budget/budget.helpers';
import { ms } from '@/utils/responsive';

const STATUS_COLOR: Record<BudgetStatus, string> = {
  under: Colors.dark.gold,
  warning: Colors.dark.warning,
  over: Colors.dark.negative,
};

export interface BudgetBarProps {
  pct: number; // 0..n (clamped to 1 for width)
  status: BudgetStatus;
  height?: number;
}

export function BudgetBar({ pct, status, height = ms(7) }: BudgetBarProps) {
  const width = `${Math.min(Math.max(pct, 0), 1) * 100}%` as const;
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width, backgroundColor: STATUS_COLOR[status] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: Colors.dark.surfaceEl, borderRadius: Radius.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.sm },
});
