import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Skeleton } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  DashboardNetWorth,
  DashboardNetWorthAmount,
} from '@/modules/accounts/domain/account_aggregation';
import { formatCurrencyParts } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

import { DASHBOARD_SKELETON_ANIMATION } from './skeleton_animation';
import { resolveMonthSpendUsdAmount, resolveNetWorthStatColor } from './stat_cards.helpers';

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
  /**
   * One object, not loose numbers: a discriminated union narrows only when the
   * discriminant and the fields arrive together, and sibling props destructured
   * in a signature do not narrow each other.
   */
  netWorth: DashboardNetWorth;
  /**
   * Read once in `dashboard.hook.ts` and passed down. It reaches the net-worth
   * card only: `monthSpentEgp` below is a ledger total in the storage currency,
   * not a converted pair, and stays on `Currency.EGP` (spec §7).
   */
  baseCurrency: Currency;
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
  netWorth,
  baseCurrency,
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
  // The card's tint is the ONE net-worth derivation that survives the refusal,
  // because the header chip renders in both states. Everything computed FROM the
  // numbers lives in `NetWorthCardBody`, which only the amount path renders —
  // arithmetic over absent fields on the refusal path is dead code a reader would
  // mistake for a live one. The colour rule itself is `resolveNetWorthStatColor`'s
  // docblock, not restated here.
  const netColor = resolveNetWorthStatColor(netWorth);
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
  const monthSpendUsdParts = resolveMonthSpendUsdAmount(monthSpentUsd);
  const monthSpendEgpParts = formatCurrencyParts(monthSpentEgp, Currency.EGP);

  return (
    <View className="mx-4 mt-2 flex-row" style={{ flexDirection: 'row', gap: ms(8) }}>
      {/* Net Worth */}
      <View
        testID="dashboard-net-worth-card"
        className="bg-surface border-border flex-1 rounded-2xl border px-3 py-2"
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
        ) : netWorth.kind === 'rate-needed' ? (
          <NetWorthRefusal />
        ) : (
          <NetWorthCardBody
            netWorth={netWorth}
            baseCurrency={baseCurrency}
            netColor={netColor}
            assetsCount={assetsCount}
            liabilitiesCount={liabilitiesCount}
          />
        )}
      </View>

      {/* Spent This Month */}
      <View
        testID="dashboard-month-spend-card"
        className="bg-surface border-border flex-1 rounded-2xl border px-3 py-2"
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
            <Text className="font-sora-bold text-foreground text-lg" numberOfLines={1}>
              {monthSpendEgpParts.value}{' '}
              <Text className="font-inter-medium text-muted text-xs">
                {monthSpendEgpParts.code}
              </Text>
            </Text>
            <Text className="font-sora-bold text-foreground text-lg" numberOfLines={1}>
              {monthSpendUsdParts.value}{' '}
              <Text className="font-inter-medium text-muted text-xs">
                {monthSpendUsdParts.code}
              </Text>
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
                  <Text className="font-sora-semibold text-xs" style={{ color: deltaColor }}>
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

/**
 * Rendered only on `kind === 'rate-needed'`. No number, no dash-as-number, no
 * partial total, no substituted rate — the union carries no value to render, by
 * construction. The remedy sentence lives on the hero card, which has the width
 * for it; this card is half a row wide and carries the state only.
 */
function NetWorthRefusal(): React.ReactElement {
  return (
    <View
      className="flex-row items-start"
      style={{ flexDirection: 'row', gap: ms(6) }}
      accessible
      accessibilityLabel={Strings.dashboardRateNeededValue}
    >
      <MaterialCommunityIcons
        name="alert-outline"
        size={Size.iconSm}
        color={SemanticTokens.warning}
      />
      <Text className="text-warning font-sora-semibold flex-1 text-xs">
        {Strings.dashboardRateNeededValue}
      </Text>
    </View>
  );
}

/**
 * The amount path's body. A subcomponent rather than an inline branch so the two
 * derivations below sit INSIDE the narrowing — computing an assets/liabilities
 * proportion on the refusal path would be dead arithmetic over fields that do not
 * exist there.
 */
function NetWorthCardBody({
  netWorth: amount,
  baseCurrency,
  netColor,
  assetsCount,
  liabilitiesCount,
}: {
  netWorth: DashboardNetWorthAmount;
  baseCurrency: Currency;
  netColor: string;
  assetsCount: number;
  liabilitiesCount: number;
}): React.ReactElement {
  const total = amount.assets + Math.abs(amount.liabilities);
  const assetsPct = total > 0 ? amount.assets / total : 1;
  const netWorthParts = formatCurrencyParts(amount.netWorth, baseCurrency);

  return (
    <>
      <Text className="font-sora-bold text-lg" style={{ color: netColor }} numberOfLines={1}>
        {netWorthParts.value}{' '}
        <Text className="font-inter-medium text-muted text-xs">{netWorthParts.code}</Text>
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
          <Text className="font-sora-semibold text-foreground text-xs" numberOfLines={1}>
            {formatCurrencyParts(amount.assets, baseCurrency).value}
          </Text>
        </View>
        <View className="flex-1" style={{ flex: 1, gap: ms(4) }}>
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
          <Text className="font-sora-semibold text-foreground text-xs" numberOfLines={1}>
            {formatCurrencyParts(amount.liabilities, baseCurrency).value}
          </Text>
        </View>
      </View>
    </>
  );
}
