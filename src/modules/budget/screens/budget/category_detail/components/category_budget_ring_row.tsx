import React from 'react';
import { View } from 'react-native';

import { BudgetRing } from '@/components/ui/budget_ring';
import { budgetRingLabelMaxWidth } from '@/components/ui/budget_ring.geometry';
import { Text } from '@/components/ui/text';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { BudgetLimitRowBody } from '@/modules/budget/components/budget_limit_row_body';
import type { CategoryBudgetRingRowVM } from '@/modules/budget/screens/budget/category_detail/category_detail.helpers';

const RING_LABEL_MAX_WIDTH = budgetRingLabelMaxWidth(Size.budgetDetailRing, Size.budgetRingStroke);

const RING_LABEL_TEXT = {
  fontSize: Type.compactBadge,
  lineHeight: lineHeightFor(Type.compactBadge),
  maxWidth: RING_LABEL_MAX_WIDTH,
  textAlign: 'center' as const,
};

export function CategoryBudgetRingRow({ row }: { row: CategoryBudgetRingRowVM }) {
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
      <BudgetLimitRowBody
        name={row.name}
        tag={row.tag}
        caption={row.caption}
        amountLabel={row.amountLabel}
        amountCode={row.amountCode}
        amountWord={row.amountWord}
        amountWordColor={row.amountWordColor}
        amountMinWidth={Size.budgetDetailAmountColumn}
      />
    </View>
  );
}
