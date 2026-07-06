import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SkeletonGroup } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

interface StatCardsProps {
  netWorthEgp: number;
  assetsEgp: number;
  liabilitiesEgp: number;
  assetsCount: number;
  liabilitiesCount: number;
  monthSpentEgp: number;
  monthSpentUsd: number;
  monthSpendDeltaPct: number | null;
  monthSpendCount: number;
  spendYearMonth: string;
  monthSpendLoading: boolean;
}

export function StatCards({
  netWorthEgp,
  assetsEgp,
  liabilitiesEgp,
  assetsCount,
  liabilitiesCount,
  monthSpentEgp,
  monthSpentUsd,
  monthSpendDeltaPct,
  monthSpendCount,
  spendYearMonth,
  monthSpendLoading,
}: StatCardsProps) {
  const netNegative = netWorthEgp < 0;
  const netColor = netNegative ? Colors.dark.negative : Colors.dark.positive;
  const total = assetsEgp + Math.abs(liabilitiesEgp);
  const assetsPct = total > 0 ? assetsEgp / total : 1;
  const monthIdx = parseInt(spendYearMonth.split('-')[1], 10) - 1;
  const monthLabel = SHORT_MONTHS[monthIdx] ?? '';
  const prevMonthLabel = SHORT_MONTHS[(monthIdx + 11) % 12] ?? '';
  const deltaPositive = monthSpendDeltaPct != null && monthSpendDeltaPct < 0;
  const deltaNegative = monthSpendDeltaPct != null && monthSpendDeltaPct > 0;
  const deltaColor = deltaPositive
    ? Colors.dark.positive
    : deltaNegative
      ? Colors.dark.negative
      : Colors.dark.text2;
  const deltaIcon: IconName = deltaPositive
    ? 'trending-down'
    : deltaNegative
      ? 'trending-up'
      : 'trending-neutral';

  return (
    <View className="mx-4 mt-2 flex-row" style={{ flexDirection: 'row', gap: ms(8) }}>
      {/* Net Worth */}
      <View
        className="bg-surface border-border flex-1 rounded-2xl border p-3"
        style={{ flex: 1, gap: ms(6) }}
      >
        <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: ms(20), height: ms(20), backgroundColor: netColor + '22' }}
          >
            <MaterialCommunityIcons name="scale-balance" size={ms(13)} color={netColor} />
          </View>
          <Text variant="hint" className="text-muted flex-1 text-xs uppercase">
            {Strings.dashNetWorthTitle}
          </Text>
        </View>
        <Text className="text-lg font-bold" style={{ color: netColor }} numberOfLines={1}>
          {formatAmount(netWorthEgp)} <Text className="text-muted text-xs font-medium">EGP</Text>
        </Text>
        <View
          className="bg-default flex-row overflow-hidden rounded"
          style={{ flexDirection: 'row', height: ms(4) }}
        >
          <View style={{ flex: assetsPct, backgroundColor: Colors.dark.positive }} />
          <View style={{ flex: 1 - assetsPct, backgroundColor: Colors.dark.negative }} />
        </View>
        <View className="flex-row" style={{ flexDirection: 'row', gap: ms(8) }}>
          <View className="flex-1" style={{ flex: 1 }}>
            <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
              <View
                style={{
                  width: ms(6),
                  height: ms(6),
                  borderRadius: ms(3),
                  backgroundColor: Colors.dark.positive,
                }}
              />
              <Text variant="hint" className="text-muted text-xs">
                {Strings.dashAssetsLabel} ({assetsCount})
              </Text>
            </View>
            <Text className="text-foreground text-xs font-semibold" numberOfLines={1}>
              {formatAmount(assetsEgp)}
            </Text>
          </View>
          <View className="flex-1" style={{ flex: 1 }}>
            <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
              <View
                style={{
                  width: ms(6),
                  height: ms(6),
                  borderRadius: ms(3),
                  backgroundColor: Colors.dark.negative,
                }}
              />
              <Text variant="hint" className="text-muted text-xs">
                {Strings.dashLiabilitiesLabel} ({liabilitiesCount})
              </Text>
            </View>
            <Text className="text-foreground text-xs font-semibold" numberOfLines={1}>
              {formatAmount(liabilitiesEgp)}
            </Text>
          </View>
        </View>
      </View>

      {/* Spent This Month */}
      <View
        className="bg-surface border-border flex-1 rounded-2xl border p-3"
        style={{ flex: 1, gap: ms(6) }}
      >
        <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: ms(20), height: ms(20), backgroundColor: Colors.dark.negative + '22' }}
          >
            <MaterialCommunityIcons name="cash-minus" size={ms(13)} color={Colors.dark.negative} />
          </View>
          <Text variant="hint" className="text-muted flex-1 text-xs uppercase">
            {Strings.dashMonthSpentTitle}
          </Text>
          <Text variant="hint" className="text-muted text-xs">
            {monthLabel}
          </Text>
        </View>
        <SkeletonGroup isLoading={monthSpendLoading} style={{ gap: ms(6) }}>
          <SkeletonGroup.Item isLoading={monthSpendLoading} className="h-6 w-28 rounded-md">
            <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
              {formatAmount(monthSpentEgp)}{' '}
              <Text className="text-muted text-xs font-medium">EGP</Text>
            </Text>
          </SkeletonGroup.Item>
          <SkeletonGroup.Item isLoading={monthSpendLoading} className="h-6 w-24 rounded-md">
            <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
              {formatAmount(monthSpentUsd, 0)}{' '}
              <Text className="text-muted text-xs font-medium">USD</Text>
            </Text>
          </SkeletonGroup.Item>
          <SkeletonGroup.Item isLoading={monthSpendLoading} className="h-5 w-full rounded-md">
            <View
              className="flex-row items-center justify-between"
              style={{ flexDirection: 'row', gap: ms(8) }}
            >
              <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(5) }}>
                <View
                  className="flex-row items-center rounded-full"
                  style={{
                    flexDirection: 'row',
                    gap: ms(3),
                    paddingHorizontal: ms(8),
                    paddingVertical: ms(2),
                    backgroundColor: deltaColor + '22',
                  }}
                >
                  <MaterialCommunityIcons name={deltaIcon} size={ms(11)} color={deltaColor} />
                  <Text className="text-xs font-semibold" style={{ color: deltaColor }}>
                    {monthSpendDeltaPct == null ? '—' : `${Math.abs(monthSpendDeltaPct)}%`}
                  </Text>
                </View>
                <Text variant="hint" className="text-muted text-xs">
                  vs {prevMonthLabel}
                </Text>
              </View>
              <Text variant="hint" className="text-muted text-xs">
                {monthSpendCount} {Strings.dashMonthSpentTxsUnit}
              </Text>
            </View>
          </SkeletonGroup.Item>
        </SkeletonGroup>
      </View>
    </View>
  );
}
