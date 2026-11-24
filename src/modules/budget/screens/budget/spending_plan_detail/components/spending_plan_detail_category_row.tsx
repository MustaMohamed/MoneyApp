import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';

import { StatusBadge } from '@/components/ui/status_badge';
import { Text } from '@/components/ui/text';
import {
  resolveOneLineTextProps,
  resolveRowStacking,
  resolveUncappedLinesAboveOne,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Radius, Size, Spacing, Type, lineHeightFor, withAlpha } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type {
  SpendingPlanDetailCategoryRowVM,
  SpendingPlanDetailLimitRowVM,
} from '@/modules/budget/screens/budget/spending_plans.types';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

interface SpendingPlanDetailCategoryRowProps {
  row: SpendingPlanDetailCategoryRowVM;
  tickPercentage?: number;
}

const MICRO_TEXT = { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) };
const NAME_TEXT = { fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) };
// D2 `.pace .now`: a 2 dp tick in a 1 dp surface ring, centred on the track.
const TICK_WIDTH = Spacing.xxxs + 2 * Size.hairline;
const TICK_STYLE: Readonly<ViewStyle> = Object.freeze({
  position: 'absolute',
  bottom: (Size.spendingPlanLimitTrack - Size.spendingPlanLimitTick) / 2 - Size.hairline,
  width: TICK_WIDTH,
  height: Size.spendingPlanLimitTick + 2 * Size.hairline,
  borderRadius: Size.hairline,
  borderWidth: Size.hairline,
  borderColor: CoreTokens.surface,
  backgroundColor: withAlpha(CoreTokens.text1, 'CC'),
  transform: [{ translateX: -TICK_WIDTH / 2 }],
});

function LimitRow({
  row,
  tickPercentage,
}: {
  row: SpendingPlanDetailLimitRowVM;
  tickPercentage?: number;
}) {
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const lines = resolveUncappedLinesAboveOne(1, fontScale);
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={row.accessibilityLabel}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: ms(64) }}
      className="px-4 py-2.5"
    >
      <View
        className="items-center justify-center"
        style={{
          width: Size.spendingPlanLimitTile,
          height: Size.spendingPlanLimitTile,
          borderRadius: Radius.sm,
          backgroundColor: row.tileFill,
        }}
      >
        <MaterialCommunityIcons
          accessible={false}
          name={toIconName(row.icon, 'tag-outline')}
          size={Size.iconXs}
          color={row.glyphColor}
        />
      </View>
      <View
        style={{ flex: 1, minWidth: 0, flexDirection: stacked ? 'column' : 'row', gap: Spacing.sm }}
      >
        <View style={{ flex: stacked ? undefined : 1, minWidth: 0, justifyContent: 'center' }}>
          <View
            style={{
              flexDirection: stacked ? 'column' : 'row',
              alignItems: stacked ? 'flex-start' : 'center',
              gap: Spacing.xxs,
            }}
          >
            <Text
              className="font-inter-medium text-foreground"
              numberOfLines={lines}
              style={{ ...NAME_TEXT, flexShrink: 1 }}
            >
              {row.categoryName}
            </Text>
            {row.tag ? <StatusBadge {...row.tag} size="xs" /> : null}
          </View>
          <Text
            className="font-inter text-content-secondary mt-0.5"
            numberOfLines={lines}
            style={MICRO_TEXT}
          >
            {row.supportingLabel}
          </Text>
          <View>
            <BudgetBar
              pct={row.pct}
              status="under"
              color={row.progressColor}
              height={Size.spendingPlanLimitTrack}
            />
            {tickPercentage === undefined ? null : (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={[TICK_STYLE, { left: `${tickPercentage}%` }]}
              />
            )}
          </View>
        </View>
        <View style={{ alignItems: stacked ? 'flex-start' : 'flex-end', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xxs }}>
            <Text className="font-sora text-foreground" style={NAME_TEXT}>
              {row.amountLabel}
            </Text>
            <Text className="font-inter text-content-secondary" style={MICRO_TEXT}>
              {row.amountCode}
            </Text>
          </View>
          <Text className="font-inter mt-0.5" style={{ ...MICRO_TEXT, color: row.balanceColor }}>
            {row.balanceLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function SpendingPlanDetailCategoryRow({
  row,
  tickPercentage,
}: SpendingPlanDetailCategoryRowProps) {
  const { fontScale } = useWindowDimensions();
  const statusLines = resolveUncappedLinesAboveOne(1, fontScale);
  if (row.kind === 'allocated') return <LimitRow row={row} tickPercentage={tickPercentage} />;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={row.accessibilityLabel}
      className="border-border min-h-[52px] flex-row items-center gap-2 border-b py-1"
    >
      <View className="bg-default h-7 w-7 items-center justify-center rounded-full">
        <MaterialCommunityIcons
          accessible={false}
          name={toIconName(row.icon, 'tag-outline')}
          size={Size.iconXs}
          color={row.color}
        />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          className="font-inter-semibold text-foreground text-[15px]"
          {...resolveOneLineTextProps(scaledTextStyleAboveOne(Type.bodyStrong, fontScale))}
        >
          {row.categoryName}
        </Text>
        <Text
          className="font-inter text-content-secondary mt-px text-[11.5px]"
          numberOfLines={statusLines}
        >
          {row.supportingLabel}
        </Text>
      </View>

      <View className="items-end">
        <Text className="font-sora-semibold text-foreground text-[15px]">{row.amountLabel}</Text>
      </View>
    </View>
  );
}
