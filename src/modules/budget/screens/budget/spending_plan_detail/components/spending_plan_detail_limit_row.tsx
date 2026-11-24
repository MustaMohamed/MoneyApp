import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';

import { StatusBadge } from '@/components/ui/status_badge';
import { Text } from '@/components/ui/text';
import {
  resolveRowStacking,
  resolveUncappedLinesAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Radius, Size, Spacing, Type, lineHeightFor, withAlpha } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type { SpendingPlanDetailLimitRowVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { toIconName } from '@/utils/icon_name_guard';

interface Props {
  row: SpendingPlanDetailLimitRowVM;
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
});

export function SpendingPlanDetailLimitRow({ row, tickPercentage }: Props) {
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const lines = resolveUncappedLinesAboveOne(1, fontScale);
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={row.accessibilityLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        minHeight: Size.spendingPlanLimitRowHeight,
      }}
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
        style={{
          flex: 1,
          minWidth: 0,
          flexDirection: 'row',
          flexWrap: stacked ? 'wrap' : 'nowrap',
          columnGap: Spacing.sm,
          rowGap: Spacing.xxs,
        }}
      >
        <View
          style={{
            ...(stacked ? { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' } : { flex: 1 }),
            minWidth: 0,
            justifyContent: 'center',
          }}
        >
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
                style={[
                  TICK_STYLE,
                  {
                    left: `${tickPercentage}%`,
                    // The offset slides with the percent so the tick stays on the track at 0 and 100.
                    transform: [{ translateX: (-TICK_WIDTH * tickPercentage) / 100 }],
                  },
                ]}
              />
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
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
