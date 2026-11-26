import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';

import { StatusBadge } from '@/components/ui/status_badge';
import { Text } from '@/components/ui/text';
import {
  resolveLoneWordLines,
  resolveRowStacking,
  resolveUncappedLinesAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Radius, Size, Spacing, Type, lineHeightFor, withAlpha } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type { SpendingPlanDetailCategoryRowVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { toIconName } from '@/utils/icon_name_guard';

interface Props {
  row: SpendingPlanDetailCategoryRowVM;
  tickPercentage?: number;
}

const MICRO_TEXT = { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) };
const NAME_TEXT = { fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) };
const TILE_STYLE = { width: Size.spendingPlanLimitTile, height: Size.spendingPlanLimitTile };
const BODY_STYLE = { flex: 1, columnGap: Spacing.sm, rowGap: Spacing.xxs };
const TICK_WIDTH = Spacing.xxxs + 2 * Size.hairline;
const TICK_STYLE: Readonly<ViewStyle> = Object.freeze({
  position: 'absolute',
  bottom: (Size.spendingPlanLimitTrack - Size.spendingPlanLimitTick) / 2 - Size.hairline,
  width: TICK_WIDTH,
  height: Size.spendingPlanLimitTick + 2 * Size.hairline,
  borderWidth: Size.hairline,
  borderRadius: Size.hairline,
  borderColor: CoreTokens.surface,
  backgroundColor: withAlpha(CoreTokens.text1, 'CC'),
});

// The offset slides with the percent so the tick stays on the track at 0 and 100.
const tickAt = (percent: number): ViewStyle => ({
  left: `${percent}%`,
  transform: [{ translateX: (-TICK_WIDTH * percent) / 100 }],
});

// D2 `.bg-row.sm`: a row with no limit pads 8 dp a side and has no bar, so no min height.
export function SpendingPlanDetailCategoryRow({ row, tickPercentage }: Props) {
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const lines = resolveUncappedLinesAboveOne(1, fontScale);
  const allocated = row.kind === 'allocated';
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={row.accessibilityLabel}
      style={{
        flexDirection: 'row',
        gap: Spacing.sm,
        ...(allocated ? { minHeight: Size.spendingPlanLimitRowHeight } : {}),
      }}
      className={allocated ? 'items-center px-4 py-2.5' : 'items-center px-4 py-2'}
    >
      <View
        className="items-center justify-center"
        style={[TILE_STYLE, { borderRadius: Radius.sm, backgroundColor: row.tileFill }]}
      >
        <MaterialCommunityIcons
          accessible={false}
          name={toIconName(row.icon, 'tag-outline')}
          size={Size.iconXs}
          color={row.glyphColor}
        />
      </View>
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
              numberOfLines={resolveLoneWordLines(row.categoryName, lines, fontScale)}
              style={{ ...NAME_TEXT, flexShrink: 1 }}
            >
              {row.categoryName}
            </Text>
            {allocated && row.tag ? <StatusBadge {...row.tag} size="xs" /> : null}
          </View>
          <Text
            className="font-inter text-content-secondary mt-0.5"
            numberOfLines={lines}
            style={MICRO_TEXT}
          >
            {row.supportingLabel}
          </Text>
          {allocated ? (
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
                  style={[TICK_STYLE, tickAt(tickPercentage)]}
                />
              )}
            </View>
          ) : null}
        </View>
        <View className="items-end justify-center">
          <View className="items-baseline" style={{ flexDirection: 'row', gap: Spacing.xxs }}>
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
