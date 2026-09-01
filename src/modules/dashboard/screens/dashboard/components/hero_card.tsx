import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Skeleton } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { Text } from '@/components/ui/text';
import { CURRENCY_CONFIG, foreignCurrencyFor } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size, Type } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  DashboardNetWorth,
  DashboardNetWorthAmount,
} from '@/modules/accounts/domain/account_aggregation';
import { formatCurrencyAmount, formatExchangeRate } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

import { formatOwnedAmountParts } from './net_worth_breakdown_sheet.helpers';
import { DASHBOARD_SKELETON_ANIMATION } from './skeleton_animation';

const DASHBOARD_HERO_AMOUNT_SKELETON_HEIGHT = ms(35);
const DASHBOARD_HERO_PILL_SKELETON_HEIGHT = ms(20);

interface HeroCardProps {
  /** One object, not loose props: narrowing needs the discriminant and fields together. */
  netWorth: DashboardNetWorth;
  /** Read once in `dashboard.hook.ts` and passed down, never from a store here. */
  baseCurrency: Currency;
  rate: number;
  /** Decided by the domain gate in `dashboard.hook.ts`, never re-derived here. */
  isRateUsable: boolean;
  isManualOverride: boolean;
  assetsCount: number;
  liabilitiesCount: number;
  isLoading: boolean;
  onPress?: () => void;
}

function HeroCardSkeleton(): React.ReactElement {
  return (
    <>
      <Skeleton
        testID="dashboard-hero-skeleton-amount"
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="mx-5 mt-3 mb-2 w-48 rounded-md"
        style={{ height: DASHBOARD_HERO_AMOUNT_SKELETON_HEIGHT }}
      />
      <View
        testID="dashboard-hero-skeleton-pills-row"
        className="flex-row flex-wrap px-5 pb-5"
        style={{
          flexDirection: 'row',
          gap: ms(6),
          minHeight: DASHBOARD_HERO_PILL_SKELETON_HEIGHT,
        }}
      >
        <Skeleton
          testID="dashboard-hero-skeleton-pill"
          animation={DASHBOARD_SKELETON_ANIMATION}
          className="w-21 rounded-full"
          style={{ height: DASHBOARD_HERO_PILL_SKELETON_HEIGHT }}
        />
        <Skeleton
          testID="dashboard-hero-skeleton-pill"
          animation={DASHBOARD_SKELETON_ANIMATION}
          className="w-28 rounded-full"
          style={{ height: DASHBOARD_HERO_PILL_SKELETON_HEIGHT }}
        />
        <Skeleton
          testID="dashboard-hero-skeleton-pill"
          animation={DASHBOARD_SKELETON_ANIMATION}
          className="w-20 rounded-full"
          style={{ height: DASHBOARD_HERO_PILL_SKELETON_HEIGHT }}
        />
      </View>
    </>
  );
}

function HeroCardAssetsAmount({
  netWorth: amount,
  baseCurrency,
}: {
  netWorth: DashboardNetWorthAmount;
  baseCurrency: Currency;
}): React.ReactElement {
  const assetsParts = formatOwnedAmountParts(amount.assets, baseCurrency);
  return (
    <Text
      className="font-sora-bold mt-3 mb-2 px-3"
      style={{ color: Colors.dark.gold, fontSize: ms(32) }}
    >
      {assetsParts.value} <Text style={{ fontSize: ms(16), opacity: 0.8 }}>{assetsParts.code}</Text>
    </Text>
  );
}

export function HeroCard({
  netWorth,
  baseCurrency,
  rate,
  isRateUsable,
  isManualOverride,
  assetsCount,
  liabilitiesCount,
  isLoading,
  onPress,
}: HeroCardProps) {
  const totalAccounts = assetsCount + liabilitiesCount;
  const foreignCurrency = foreignCurrencyFor(baseCurrency);

  return (
    // Not tappable on the refusal path: there is no honest breakdown of a refused total.
    <HeroShell
      onPress={netWorth.kind === 'rate-needed' ? undefined : onPress}
      accessibilityLabel={Strings.dashAvailableToSpend}
    >
      <View
        className="flex-row items-center justify-between px-3 pt-3"
        style={{ flexDirection: 'row' }}
      >
        <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(6) }}>
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: ms(24),
              height: ms(24),
              backgroundColor: Colors.dark.goldTint,
            }}
          >
            <MaterialCommunityIcons name="wallet" size={ms(14)} color={Colors.shared.cairoGold} />
          </View>
          <Text variant="caption" className="text-foreground tracking-wide">
            {Strings.dashAvailableToSpend}
          </Text>
        </View>
        {isManualOverride && (
          <View
            className="flex-row items-center rounded-full"
            style={{
              flexDirection: 'row',
              gap: ms(4),
              paddingHorizontal: ms(8),
              paddingVertical: ms(3),
              backgroundColor: Colors.dark.goldTint,
              borderWidth: 1,
              borderColor: Colors.shared.cairoGold,
            }}
          >
            <View
              style={{
                width: ms(5),
                height: ms(5),
                borderRadius: ms(3),
                backgroundColor: Colors.shared.cairoGold,
              }}
            />
            <Text
              variant="caption"
              className="uppercase"
              style={{ color: Colors.shared.cairoGold }}
            >
              {Strings.currencyManualShort}
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <HeroCardSkeleton />
      ) : (
        <>
          {netWorth.kind === 'rate-needed' ? (
            <>
              {/* Warning, not danger: nothing failed, and no number or rate is substituted. */}
              <View
                className="mt-3 mb-1 flex-row items-center px-3"
                style={{ flexDirection: 'row', gap: ms(8) }}
                accessible
                accessibilityLabel={Strings.dashboardRateNeededValue}
              >
                <MaterialCommunityIcons
                  name="alert-outline"
                  size={Size.iconMd}
                  color={SemanticTokens.warning}
                />
                <Text
                  className="text-warning font-sora-semibold flex-1"
                  style={{ fontSize: Type.headline }}
                >
                  {Strings.dashboardRateNeededValue}
                </Text>
              </View>
              <Text variant="caption" className="mb-2 px-3">
                {Strings.dashboardRateNeededCaption}
              </Text>
            </>
          ) : (
            <HeroCardAssetsAmount netWorth={netWorth} baseCurrency={baseCurrency} />
          )}

          <View
            className="flex-row flex-wrap px-3 pb-5"
            style={{ flexDirection: 'row', gap: ms(6) }}
          >
            <View
              className="flex-row items-center rounded-full px-2 py-1"
              style={{
                flexDirection: 'row',
                gap: ms(4),
                backgroundColor: Colors.dark.overlayWhite7,
              }}
            >
              <MaterialCommunityIcons
                name="approximately-equal"
                size={ms(11)}
                color={Colors.dark.text1}
              />
              {/* Assets, not net worth: the sheet's ≈ caption differs on purpose. */}
              <Text className="text-foreground text-xs">
                {netWorth.kind === 'amount' && netWorth.assetsForeign !== undefined
                  ? formatCurrencyAmount(netWorth.assetsForeign, foreignCurrency)
                  : Strings.netWorthBreakdownForeignUnavailable(
                      CURRENCY_CONFIG[foreignCurrency].code,
                    )}
              </Text>
            </View>
            {isRateUsable ? (
              <View
                testID="dashboard-hero-rate-pill"
                className="flex-row items-center rounded-full px-2 py-1"
                style={{
                  flexDirection: 'row',
                  gap: ms(4),
                  backgroundColor: Colors.dark.overlayWhite7,
                }}
              >
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={ms(11)}
                  color={Colors.dark.text1}
                />
                <Text className="text-foreground text-xs">{formatExchangeRate(rate)}</Text>
              </View>
            ) : null}
            <View
              className="flex-row items-center rounded-full px-2 py-1"
              style={{
                flexDirection: 'row',
                gap: ms(4),
                backgroundColor: Colors.dark.overlayWhite7,
              }}
            >
              <MaterialCommunityIcons name="bank-outline" size={ms(11)} color={Colors.dark.text1} />
              <Text className="text-foreground text-xs">
                {totalAccounts} {Strings.o6AccountsUnit}
              </Text>
            </View>
          </View>
        </>
      )}
    </HeroShell>
  );
}
