import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { BudgetRing } from '@/components/ui/budget_ring';
import { StatusBadge } from '@/components/ui/status_badge';
import { Text } from '@/components/ui/text';
import {
  resolveLoneWordLines,
  resolveRowStacking,
  resolveUncappedLinesAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import type { CategoryBudgetRingRowVM } from '@/modules/budget/screens/budget/category_detail/category_detail.helpers';

// The ring's hole less 2 dp each side, so a label shrinks to fit rather than wrap onto the stroke.
const RING_LABEL_MAX_WIDTH = Size.budgetDetailRing - 2 * (Size.budgetRingStroke + Spacing.xxxs);

const RING_LABEL_TEXT = {
  fontSize: Type.compactBadge,
  lineHeight: lineHeightFor(Type.compactBadge),
  maxWidth: RING_LABEL_MAX_WIDTH,
  textAlign: 'center' as const,
};
const MICRO_TEXT = { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) };
const NAME_TEXT = { fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) };
const BODY_STYLE = { flex: 1, columnGap: Spacing.sm, rowGap: Spacing.xxs };

export function CategoryBudgetRingRow({ row }: { row: CategoryBudgetRingRowVM }) {
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const lines = resolveUncappedLinesAboveOne(1, fontScale);
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={row.accessibilityLabel}
      style={{ flexDirection: 'row', gap: Spacing.sm, minHeight: Size.budgetDetailRowMinHeight }}
      className="items-center px-4 py-2.5"
    >
      <BudgetRing
        pct={row.ringShare}
        color={row.ringColor}
        size={Size.budgetDetailRing}
        stroke={Size.budgetRingStroke}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className="font-sora-bold text-foreground"
          style={RING_LABEL_TEXT}
        >
          {row.usedLabel}
        </Text>
      </BudgetRing>
      <View
        className="min-w-0"
        style={[BODY_STYLE, { flexDirection: 'row', flexWrap: stacked ? 'wrap' : 'nowrap' }]}
      >
        <View
          className="min-w-0 justify-center"
          style={stacked ? { flexGrow: 1, flexShrink: 1 } : { flex: 1 }}
        >
          <View
            className={stacked ? 'items-start' : 'items-center'}
            style={{ flexDirection: stacked ? 'column' : 'row', gap: Spacing.xxs }}
          >
            <Text
              className="font-inter-medium text-foreground"
              numberOfLines={resolveLoneWordLines(row.name, lines, fontScale)}
              style={{ ...NAME_TEXT, flexShrink: 1 }}
            >
              {row.name}
            </Text>
            {row.tag ? <StatusBadge {...row.tag} size="xs" /> : null}
          </View>
          <Text
            className="font-inter text-content-secondary mt-0.5"
            numberOfLines={lines}
            style={MICRO_TEXT}
          >
            {row.caption}
          </Text>
        </View>
        <View
          className="items-end justify-center"
          style={{ minWidth: Size.budgetDetailAmountColumn }}
        >
          <View className="items-baseline" style={{ flexDirection: 'row', gap: Spacing.xxs }}>
            <Text className="font-sora text-foreground" style={NAME_TEXT}>
              {row.amountLabel}
            </Text>
            <Text className="font-inter text-content-secondary" style={MICRO_TEXT}>
              {row.amountCode}
            </Text>
          </View>
          <Text className="font-inter mt-0.5" style={{ ...MICRO_TEXT, color: row.amountWordColor }}>
            {row.amountWord}
          </Text>
        </View>
      </View>
    </View>
  );
}
