import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { StatusBadge } from '@/components/ui/status_badge';
import { Text } from '@/components/ui/text';
import {
  resolveLoneWordLines,
  resolveRowStacking,
  resolveUncappedLinesAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';
import type { BudgetLimitTag } from '@/modules/budget/utils/budget_hero';

const MICRO_TEXT = { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) };
const NAME_TEXT = { fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) };
const BODY_STYLE = { flex: 1, columnGap: Spacing.sm, rowGap: Spacing.xxs };

interface BudgetLimitRowBodyProps {
  name: string;
  tag?: BudgetLimitTag;
  caption: string;
  amountLabel: string;
  amountCode: string;
  amountWord: string;
  amountWordColor: string;
  amountMinWidth?: number;
  children?: React.ReactNode;
}

export function BudgetLimitRowBody({
  name,
  tag,
  caption,
  amountLabel,
  amountCode,
  amountWord,
  amountWordColor,
  amountMinWidth,
  children,
}: BudgetLimitRowBodyProps) {
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const lines = resolveUncappedLinesAboveOne(1, fontScale);
  return (
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
            numberOfLines={resolveLoneWordLines(name, lines, fontScale)}
            style={{ ...NAME_TEXT, flexShrink: 1 }}
          >
            {name}
          </Text>
          {tag ? <StatusBadge {...tag} size="xs" /> : null}
        </View>
        <Text
          className="font-inter text-content-secondary mt-0.5"
          numberOfLines={lines}
          style={MICRO_TEXT}
        >
          {caption}
        </Text>
        {children}
      </View>
      <View
        className="items-end justify-center"
        style={amountMinWidth === undefined ? undefined : { minWidth: amountMinWidth }}
      >
        <View className="items-baseline" style={{ flexDirection: 'row', gap: Spacing.xxs }}>
          <Text className="font-sora text-foreground" style={NAME_TEXT}>
            {amountLabel}
          </Text>
          <Text className="font-inter text-content-secondary" style={MICRO_TEXT}>
            {amountCode}
          </Text>
        </View>
        <Text className="font-inter mt-0.5" style={{ ...MICRO_TEXT, color: amountWordColor }}>
          {amountWord}
        </Text>
      </View>
    </View>
  );
}
