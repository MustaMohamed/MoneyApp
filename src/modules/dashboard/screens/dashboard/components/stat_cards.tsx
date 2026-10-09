import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Skeleton } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Text } from '@/components/ui/text';
import {
  resolveFitAmountTextProps,
  resolveRowStacking,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size, Type, withAlpha } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  DashboardNetWorth,
  DashboardNetWorthAmount,
} from '@/modules/accounts/domain/account_aggregation';
import {
  formatCurrencyAmount,
  formatCurrencyParts,
  formatLiabilityRowValue,
  formatOwnedAmountParts,
} from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

import { DASHBOARD_SKELETON_ANIMATION } from './skeleton_animation';
import {
  type MonthSpendLegState,
  resolveMonthSpendLeg,
  resolveMonthSpendRows,
  resolveNetWorthStatColor,
  shouldShowNetWorthProportionBar,
} from './stat_cards.helpers';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Single source for the spoken/rendered state word: the visible qualifier and the composed
// accessibilityLabel both read this map, so they cannot diverge (PR #376 review).
const MONTH_SPEND_STATE_LABEL: Record<MonthSpendLegState, string> = {
  spent: Strings.dashMonthSpentSpentLabel,
  refunded: Strings.dashMonthSpentRefundedLabel,
};

const DASHBOARD_NET_WORTH_VALUE_HEIGHT = ms(22);
const DASHBOARD_NET_WORTH_PROGRESS_HEIGHT = ms(5);
const DASHBOARD_NET_WORTH_DETAIL_LABEL_HEIGHT = ms(10);
const DASHBOARD_NET_WORTH_DETAIL_VALUE_HEIGHT = ms(12);
const DASHBOARD_MONTH_SPEND_FOOTER_HEIGHT = ms(16);
// Raw px: ms() would move the bars' 1.0 height.
const DASHBOARD_MONTH_SPEND_VALUE_BAR_HEIGHT = 20;

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
  /** One object: sibling props destructured in a signature do not narrow each other. */
  netWorth: DashboardNetWorth;
  /** Reports the net-worth card and orders the month-spend rows; both spend totals stay native. */
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
  const { fontScale } = useWindowDimensions();
  const valueHeight = resolveSkeletonBarHeight(DASHBOARD_NET_WORTH_VALUE_HEIGHT, fontScale);
  const labelHeight = resolveSkeletonBarHeight(DASHBOARD_NET_WORTH_DETAIL_LABEL_HEIGHT, fontScale);
  const detailHeight = resolveSkeletonBarHeight(DASHBOARD_NET_WORTH_DETAIL_VALUE_HEIGHT, fontScale);
  return (
    <>
      <Skeleton
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="w-28 rounded-md"
        style={{ height: valueHeight }}
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
            style={{ height: labelHeight }}
          />
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-16 rounded-md"
            style={{ height: detailHeight }}
          />
        </View>
        <View style={{ flex: 1, gap: ms(4) }}>
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-18 rounded-md"
            style={{ height: labelHeight }}
          />
          <Skeleton
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="w-16 rounded-md"
            style={{ height: detailHeight }}
          />
        </View>
      </View>
    </>
  );
}

function MonthSpendValueSkeleton(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const valueHeight = resolveSkeletonBarHeight(DASHBOARD_MONTH_SPEND_VALUE_BAR_HEIGHT, fontScale);
  return (
    <>
      <Skeleton
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="mb-1 w-28 rounded-md"
        style={{ height: valueHeight }}
      />
      <Skeleton
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="w-24 rounded-md"
        style={{ height: valueHeight }}
      />
    </>
  );
}

function MonthSpendFooterSkeleton(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const footerHeight = resolveSkeletonBarHeight(DASHBOARD_MONTH_SPEND_FOOTER_HEIGHT, fontScale);
  const labelHeight = resolveSkeletonBarHeight(ms(10), fontScale);
  return (
    <View
      testID="dashboard-month-spend-skeleton-footer-row"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: ms(8),
        minHeight: footerHeight,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(5) }}>
        <Skeleton
          testID="dashboard-month-spend-skeleton-footer-item"
          animation={DASHBOARD_SKELETON_ANIMATION}
          className="rounded-full"
          style={{ width: ms(48), height: footerHeight }}
        />
        <Skeleton
          testID="dashboard-month-spend-skeleton-footer-item"
          animation={DASHBOARD_SKELETON_ANIMATION}
          className="rounded-md"
          style={{ width: ms(32), height: labelHeight }}
        />
      </View>
      <Skeleton
        testID="dashboard-month-spend-skeleton-footer-item"
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="rounded-md"
        style={{ width: ms(30), height: labelHeight }}
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
  // Computed outside the narrowing because the tinted chip renders on the refusal path too.
  const netColor = resolveNetWorthStatColor(netWorth);
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const captionText = scaledTextStyle(Type.caption, fontScale);
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
  // A negative net never reaches the formatter here (#332): the sign resolves to a state
  // (spent/refunded) and only the magnitude is formatted.
  const monthSpendEgpLeg = resolveMonthSpendLeg(monthSpentEgp);
  const monthSpendUsdLeg = resolveMonthSpendLeg(monthSpentUsd);
  const monthSpendEgpParts = {
    ...formatCurrencyParts(monthSpendEgpLeg.magnitude, Currency.EGP),
    withCode: formatCurrencyAmount(monthSpendEgpLeg.magnitude, Currency.EGP),
    state: monthSpendEgpLeg.state,
  };
  const monthSpendUsdParts = {
    ...formatCurrencyParts(monthSpendUsdLeg.magnitude, Currency.USD),
    withCode: formatCurrencyAmount(monthSpendUsdLeg.magnitude, Currency.USD),
    state: monthSpendUsdLeg.state,
  };
  const monthSpendRows = resolveMonthSpendRows(
    baseCurrency,
    monthSpendEgpParts,
    monthSpendUsdParts,
  );

  // Above 1.0 the month leaves the header row for its own line, so each word of the title fits.
  const monthLabelText = (
    <Text
      variant="hint"
      allowFontScaling={false}
      style={stacked ? { ...captionText, alignSelf: 'flex-end' } : captionText}
      className="text-muted"
    >
      {monthLabel}
    </Text>
  );

  return (
    <View className="mx-4 mt-2 flex-row" style={{ flexDirection: 'row', gap: ms(8) }}>
      <View
        testID="dashboard-net-worth-card"
        className="bg-surface border-border flex-1 rounded-2xl border px-3 py-2"
        style={{ flex: 1, gap: ms(6) }}
      >
        <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: ms(20), height: ms(20), backgroundColor: withAlpha(netColor, '22') }}
          >
            <MaterialCommunityIcons name="scale-balance" size={ms(13)} color={netColor} />
          </View>
          <Text
            variant="hint"
            allowFontScaling={false}
            style={captionText}
            className="text-muted flex-1 uppercase"
          >
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

      <View
        testID="dashboard-month-spend-card"
        className="bg-surface border-border flex-1 rounded-2xl border px-3 py-2"
        style={{ flex: 1, gap: ms(6) }}
      >
        <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: ms(20),
              height: ms(20),
              backgroundColor: withAlpha(Colors.dark.negative, '22'),
            }}
          >
            <MaterialCommunityIcons name="cash-minus" size={ms(13)} color={Colors.dark.negative} />
          </View>
          <Text
            variant="hint"
            allowFontScaling={false}
            style={captionText}
            className="text-muted flex-1 uppercase"
          >
            {Strings.dashMonthSpentTitle}
          </Text>
          {stacked ? null : monthLabelText}
        </View>
        {stacked ? monthLabelText : null}
        {monthSpendLoading ? (
          <>
            <MonthSpendValueSkeleton />
            <MonthSpendFooterSkeleton />
          </>
        ) : (
          <>
            {monthSpendRows.map((parts) => (
              <Text
                key={parts.code}
                {...resolveFitAmountTextProps(Type.title, fontScale)}
                className="font-sora-bold text-foreground"
                accessibilityLabel={`${parts.withCode} ${MONTH_SPEND_STATE_LABEL[parts.state]}`}
              >
                {parts.value}{' '}
                <Text className="font-inter-medium text-muted" style={captionText}>
                  {parts.code}
                </Text>
                {parts.state === 'refunded' && (
                  <Text className="font-inter-medium text-muted" style={captionText}>
                    {' '}
                    {MONTH_SPEND_STATE_LABEL[parts.state]}
                  </Text>
                )}
              </Text>
            ))}
            <View
              className="flex-row items-center justify-between"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ms(8) }}
            >
              <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(5) }}>
                <View
                  className="flex-row items-center rounded-full"
                  style={{
                    flexDirection: 'row',
                    gap: ms(3),
                    paddingHorizontal: ms(8),
                    paddingVertical: ms(2),
                    backgroundColor: withAlpha(deltaColor, '22'),
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

/** On `rate-needed` nothing numeric renders: no dash, no partial total, no substituted rate. */
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

/** A subcomponent, not an inline branch, so the derivations sit inside the amount narrowing. */
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
  // Gated on both parts being non-negative, not re-signed with `Math.abs` (#345).
  const showProportionBar = shouldShowNetWorthProportionBar(amount);
  const partsTotal = amount.assets + amount.liabilities;
  const assetsPct = showProportionBar ? amount.assets / partsTotal : 0;
  const netWorthParts = formatOwnedAmountParts(amount.netWorth, baseCurrency);
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const captionText = scaledTextStyle(Type.caption, fontScale);
  const valueText = resolveFitAmountTextProps(Type.title, fontScale);
  const detailValueText = resolveFitAmountTextProps(Type.caption, fontScale);
  // Above 1.0 a label is wider than a half column, so each detail takes a full-width row.
  const detailColumnStyle = stacked ? { gap: ms(4) } : { flex: 1, gap: ms(4) };
  const detailLabelText = stacked ? { ...captionText, flexShrink: 1 } : captionText;

  return (
    <>
      <Text
        {...valueText}
        className="font-sora-bold"
        style={{ ...valueText.style, color: netColor }}
      >
        {netWorthParts.value}{' '}
        <Text className="font-inter-medium text-muted" style={captionText}>
          {netWorthParts.code}
        </Text>
      </Text>
      {showProportionBar && (
        <View
          className="bg-default flex-row overflow-hidden rounded"
          style={{ flexDirection: 'row', height: ms(4) }}
        >
          <View style={{ flex: assetsPct, backgroundColor: Colors.dark.positive }} />
          <View style={{ flex: 1 - assetsPct, backgroundColor: Colors.dark.negative }} />
        </View>
      )}
      <View className="mt-1" style={{ flexDirection: stacked ? 'column' : 'row', gap: ms(8) }}>
        <View style={detailColumnStyle}>
          <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
            <View
              style={{
                width: ms(6),
                height: ms(6),
                borderRadius: ms(3),
                backgroundColor: Colors.dark.positive,
              }}
            />
            <Text
              variant="hint"
              allowFontScaling={false}
              style={detailLabelText}
              className="text-muted"
            >
              {Strings.dashAssetsLabel} ({assetsCount})
            </Text>
          </View>
          <Text {...detailValueText} className="font-sora-semibold text-foreground">
            {formatOwnedAmountParts(amount.assets, baseCurrency).value}
          </Text>
        </View>
        <View style={detailColumnStyle}>
          <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
            <View
              style={{
                width: ms(6),
                height: ms(6),
                borderRadius: ms(3),
                backgroundColor: Colors.dark.negative,
              }}
            />
            <Text
              variant="hint"
              allowFontScaling={false}
              style={detailLabelText}
              className="text-muted"
            >
              {Strings.dashLiabilitiesLabel} ({liabilitiesCount})
            </Text>
          </View>
          <Text {...detailValueText} className="font-sora-semibold text-foreground">
            {formatLiabilityRowValue(amount.liabilities, baseCurrency)}
          </Text>
        </View>
      </View>
    </>
  );
}
