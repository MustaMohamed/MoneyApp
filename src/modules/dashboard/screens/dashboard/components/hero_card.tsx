import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Skeleton } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size, Type } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  DashboardNetWorth,
  DashboardNetWorthAmount,
} from '@/modules/accounts/domain/account_aggregation';
import {
  formatCurrencyAmount,
  formatCurrencyParts,
  formatExchangeRate,
} from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

import { DASHBOARD_SKELETON_ANIMATION } from './skeleton_animation';

const DASHBOARD_HERO_AMOUNT_SKELETON_HEIGHT = ms(35);
const DASHBOARD_HERO_PILL_SKELETON_HEIGHT = ms(20);

interface HeroCardProps {
  /**
   * One object, not loose numbers: a discriminated union narrows only when the
   * discriminant and the fields arrive together, and sibling props destructured
   * in a signature do not narrow each other.
   */
  netWorth: DashboardNetWorth;
  rate: number;
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

/**
 * The amount path's headline, kept as a subcomponent rather than inline so the two
 * `formatCurrencyParts` calls the value/code split needs collapse to one. Matches
 * `stat_cards.tsx`'s `NetWorthCardBody` and `net_worth_breakdown_sheet.tsx`'s
 * `NetWorthBreakdownBody` — the established shape for a `DashboardNetWorthAmount`-narrowed
 * subcomponent in this codebase, not a compiler requirement (an if/else-scoped const also
 * compiles here).
 */
function HeroCardAssetsAmount({
  netWorth,
}: {
  netWorth: DashboardNetWorthAmount;
}): React.ReactElement {
  const assetsEgpParts = formatCurrencyParts(netWorth.assetsEgp, Currency.EGP);
  return (
    <Text
      className="font-sora-bold mt-3 mb-2 px-3"
      style={{ color: Colors.dark.gold, fontSize: ms(32) }}
    >
      {assetsEgpParts.value}{' '}
      <Text style={{ fontSize: ms(16), opacity: 0.8 }}>{assetsEgpParts.code}</Text>
    </Text>
  );
}

export function HeroCard({
  netWorth,
  rate,
  isManualOverride,
  assetsCount,
  liabilitiesCount,
  isLoading,
  onPress,
}: HeroCardProps) {
  const totalAccounts = assetsCount + liabilitiesCount;

  return (
    /*
     * The hero is NOT tappable on the refusal path: the breakdown sheet cannot
     * honestly show a breakdown when the headline refused to state a total, so
     * it does not open at all. Rendering the sheet's EGP-only rows instead is
     * not the alternative — a refusal only fires when at least one non-archived
     * account is foreign, so those rows would be a partial total over an
     * incomplete account set, which spec §7 prohibits by name.
     *
     * `NetWorthBreakdownSheet` still suppresses its body on `rate-needed`. With
     * the sheet unreachable in that state that suppression becomes a SECOND
     * guard rather than the primary one, and it stays: the sheet's prop is
     * public and nothing in its own file makes the state impossible.
     *
     * `HeroShell` drops the `Pressable` wrapper entirely when `onPress` is
     * undefined, so this also removes the button role and the press feedback.
     */
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
              backgroundColor: Colors.shared.cairoGold + '22',
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
              backgroundColor: Colors.shared.cairoGold + '22',
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
              {/* Warning, not danger — nothing failed and nothing is broken.
                  No number, no dash-as-number, no partial total, no substituted
                  rate: `INITIAL_STATE.rate` is an unverified guess. Mirrors
                  `ready_hero_card.tsx`'s refusal so the two read as one app. */}
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
            <HeroCardAssetsAmount netWorth={netWorth} />
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
              {/* Keyed on the FIELD being absent, not on `rate > 0`:
                  `INITIAL_STATE.rate` is 50, so the old check printed a
                  confident `~ N USD` computed from the placeholder for every
                  user who had never fetched a rate. No `?? 0` — `formatAmount(0)`
                  is a wrong number, not an absent one. */}
              <Text className="text-foreground text-xs">
                {netWorth.kind === 'amount' && netWorth.assetsUsd !== undefined
                  ? formatCurrencyAmount(netWorth.assetsUsd, Currency.USD)
                  : Strings.netWorthBreakdownUsdUnavailable}
              </Text>
            </View>
            {/* The rate pill prints the very number the refusal exists to hide:
                on `rate-needed` the only rate available is the unverified one
                (`INITIAL_STATE.rate` is 50), so `1 USD = 50.00 EGP` would sit
                one line under "Exchange rate needed". `ready_hero_card.tsx`,
                the refusal this card mirrors, shows no rate at all in that
                state. The amount path is untouched. */}
            {netWorth.kind === 'rate-needed' ? null : (
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
            )}
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
