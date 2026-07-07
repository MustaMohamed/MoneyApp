import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Skeleton } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

import { DASHBOARD_SKELETON_ANIMATION } from './skeleton_animation';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const DASHBOARD_NET_WORTH_VALUE_HEIGHT = ms(22);
const DASHBOARD_NET_WORTH_PROGRESS_HEIGHT = ms(5);
const DASHBOARD_NET_WORTH_DETAIL_LABEL_HEIGHT = ms(10);
const DASHBOARD_NET_WORTH_DETAIL_VALUE_HEIGHT = ms(12);
const DASHBOARD_MONTH_SPEND_FOOTER_HEIGHT = ms(16);

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
  netWorthLoading: boolean;
  monthSpendLoading: boolean;
}

function NetWorthSkeleton(): React.ReactElement {
  return (
    <>
      <Skeleton
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="w-28 rounded-md"
        style={{ height: DASHBOARD_NET_WORTH_VALUE_HEIGHT }}
      />
      <Skeleton
        testID="dashboard-net-worth-skeleton-progress"
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="w-full rounded"
        style={{ height: DASHBOARD_NET_WORTH_PROGRESS_HEIGHT }}
      />
      <View className="mt-1" style={{ flexDirection: 'row', gap: ms(8) }}>
        <View style={{ flex: 1, gap: ms(4) }}>
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-18 rounded-md"
            style={{ height: DASHBOARD_NET_WORTH_DETAIL_LABEL_HEIGHT }}
          />
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-16 rounded-md"
            style={{ height: DASHBOARD_NET_WORTH_DETAIL_VALUE_HEIGHT }}
          />
        </View>
        <View style={{ flex: 1, gap: ms(4) }}>
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-18 rounded-md"
            style={{ height: DASHBOARD_NET_WORTH_DETAIL_LABEL_HEIGHT }}
          />
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-16 rounded-md"
            style={{ height: DASHBOARD_NET_WORTH_DETAIL_VALUE_HEIGHT }}
          />
        </View>
      </View>
    </>
  );
}

function MonthSpendFooterSkeleton(): React.ReactElement {
  return (
    <View
      testID="dashboard-month-spend-skeleton-footer-row"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: ms(8),
        minHeight: DASHBOARD_MONTH_SPEND_FOOTER_HEIGHT,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(5) }}>
        <Skeleton
          testID="dashboard-month-spend-skeleton-footer-item"
          animation={DASHBOARD_SKELETON_ANIMATION}
          className="rounded-full"
          style={{ width: ms(48), height: DASHBOARD_MONTH_SPEND_FOOTER_HEIGHT }}
        />
        <Skeleton
          testID="dashboard-month-spend-skeleton-footer-item"
          animation={DASHBOARD_SKELETON_ANIMATION}
          className="rounded-md"
          style={{ width: ms(32), height: ms(10) }}
        />
      </View>
      <Skeleton
        testID="dashboard-month-spend-skeleton-footer-item"
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="rounded-md"
        style={{ width: ms(30), height: ms(10) }}
      />
    </View>
  );
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
  netWorthLoading,
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
        testID="dashboard-net-worth-card"
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
        {netWorthLoading ? (
          <NetWorthSkeleton />
        ) : (
          <>
            <Text className="text-lg font-bold" style={{ color: netColor }} numberOfLines={1}>
              {formatAmount(netWorthEgp)}{' '}
              <Text className="text-muted text-xs font-medium">EGP</Text>
            </Text>
            <View
              className="bg-default flex-row overflow-hidden rounded"
              style={{ flexDirection: 'row', height: ms(4) }}
            >
              <View style={{ flex: assetsPct, backgroundColor: Colors.dark.positive }} />
              <View style={{ flex: 1 - assetsPct, backgroundColor: Colors.dark.negative }} />
            </View>
            <View className="mt-1 flex-row" style={{ flexDirection: 'row', gap: ms(8) }}>
              <View className="flex-1" style={{ flex: 1, gap: ms(4) }}>
                <View
                  className="flex-row items-center"
                  style={{ flexDirection: 'row', gap: ms(4) }}
                >
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
              <View className="flex-1" style={{ flex: 1, gap: ms(4) }}>
                <View
                  className="flex-row items-center"
                  style={{ flexDirection: 'row', gap: ms(4) }}
                >
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
          </>
        )}
      </View>

      {/* Spent This Month */}
      <View
        testID="dashboard-month-spend-card"
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
        {monthSpendLoading ? (
          <>
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="mb-1 h-5 w-28 rounded-md"
            />
            <Skeleton animation={DASHBOARD_SKELETON_ANIMATION} className="h-5 w-24 rounded-md" />
            <MonthSpendFooterSkeleton />
          </>
        ) : (
          <>
            <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
              {formatAmount(monthSpentEgp)}{' '}
              <Text className="text-muted text-xs font-medium">EGP</Text>
            </Text>
            <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
              {formatAmount(monthSpentUsd, 0)}{' '}
              <Text className="text-muted text-xs font-medium">USD</Text>
            </Text>
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
          </>
        )}
      </View>
    </View>
  );
}
