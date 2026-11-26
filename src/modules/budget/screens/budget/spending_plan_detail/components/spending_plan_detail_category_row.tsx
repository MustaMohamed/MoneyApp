import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { Radius, Size, Spacing, withAlpha } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { BudgetLimitRowBody } from '@/modules/budget/components/budget_limit_row_body';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type { SpendingPlanDetailCategoryRowVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { toIconName } from '@/utils/icon_name_guard';

interface Props {
  row: SpendingPlanDetailCategoryRowVM;
  tickPercentage?: number;
}

const TILE_STYLE = { width: Size.spendingPlanLimitTile, height: Size.spendingPlanLimitTile };
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

// D2 `.bg-row.sm`: a row with no limit pads 8 dp top and bottom and has no bar, so no min height.
export function SpendingPlanDetailCategoryRow({ row, tickPercentage }: Props) {
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
      <BudgetLimitRowBody
        name={row.categoryName}
        tag={allocated ? row.tag : undefined}
        caption={row.supportingLabel}
        amountLabel={row.amountLabel}
        amountCode={row.amountCode}
        amountWord={row.balanceLabel}
        amountWordColor={row.balanceColor}
      >
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
      </BudgetLimitRowBody>
    </View>
  );
}
