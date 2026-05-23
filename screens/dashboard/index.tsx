import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'heroui-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { EmptyState } from '@/components/ui/empty_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';

import { AccountCarousel } from './components/account_carousel';
import { CommitmentsCard } from './components/commitments_card';
import { HeroCard } from './components/hero_card';
import { NetWorthBreakdownSheet } from './components/net_worth_breakdown_sheet';
import { SectionHeader } from './components/section_header';
import { StatCards } from './components/stat_cards';
import { TotalBalanceStrip } from './components/total_balance_strip';
import { useDashboardAnim } from './dashboard.anim';
import { useDashboard } from './dashboard.hook';
import type { DashboardSegment } from './types';

const TYPE_ORDER: AccountType[] = [
  AccountType.Bank,
  AccountType.SmartWallet,
  AccountType.PhysicalWallet,
  AccountType.PhysicalSavings,
  AccountType.CreditCard,
];

const SECTION_TITLES: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank.toUpperCase(),
  [AccountType.SmartWallet]: Strings.typeSmartWallet.toUpperCase(),
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet.toUpperCase(),
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings.toUpperCase(),
  [AccountType.CreditCard]: Strings.typeCreditCard.toUpperCase(),
};

export default function DashboardScreen() {
  const {
    state,
    setBreakdownVisible,
    setSelectedSegment,
    refresh,
    goToAccount,
    goToAddAccount,
    goToSettings,
    goToCommitments,
  } = useDashboard();
  const { heroStyle, startEntrance, statsEntering, sectionEntering } = useDashboardAnim();

  useEffect(() => {
    startEntrance();
  }, [startEntrance]);

  const hasAccounts = state.accounts.length > 0;
  const visibleTypes = TYPE_ORDER.filter((t) => state.groupedAccounts[t]?.length);
  const segment = state.selectedSegment;
  const totalAccountsCount = state.accountCounts.assets + state.accountCounts.liabilities;

  const onTabChange = useCallback(
    (value: string) => setSelectedSegment(value as DashboardSegment),
    [setSelectedSegment],
  );

  // Swipe left → Accounts; swipe right → Overview.
  // activeOffsetX gates activation on clear horizontal intent so the carousel's
  // own horizontal scroll wins inside the Accounts segment. setSelectedSegment
  // is a no-op when called with the already-active segment, so we don't gate
  // by current value on the worklet side.
  const SWIPE_THRESHOLD = 50;
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-15, 15])
        .onEnd((e) => {
          'worklet';
          if (e.translationX < -SWIPE_THRESHOLD) {
            scheduleOnRN(setSelectedSegment, 'accounts');
          } else if (e.translationX > SWIPE_THRESHOLD) {
            scheduleOnRN(setSelectedSegment, 'overview');
          }
        }),
    [setSelectedSegment],
  );

  return (
    <Screen edges={['top']}>
      <View
        className="flex-row items-center justify-between px-4"
        style={{ flexDirection: 'row', height: Size.headerHeight }}
      >
        <Text
          className="font-bold"
          style={{ fontFamily: FontFamily.soraBold, fontSize: Type.title }}
        >
          MoneyApp
        </Text>
        <Pressable
          onPress={goToSettings}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          className="bg-surface border-border items-center justify-center rounded-lg border"
          style={{ width: Size.backBtn, height: Size.backBtn }}
        >
          <MaterialCommunityIcons name="cog" size={Size.iconMd} color={Colors.dark.text2} />
        </Pressable>
      </View>

      {!hasAccounts ? (
        <EmptyState variant="accounts" onAction={goToAddAccount} />
      ) : (
        <>
          <Tabs value={segment} onValueChange={onTabChange}>
            <Tabs.List className="mx-4 mt-2 mb-2">
              <Tabs.Indicator />
              <Tabs.Trigger value="overview" className="flex-1">
                <Tabs.Label>{Strings.dashboardSegmentOverview}</Tabs.Label>
              </Tabs.Trigger>
              <Tabs.Trigger value="accounts" className="flex-1">
                <Tabs.Label>{Strings.dashboardSegmentAccounts}</Tabs.Label>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs>

          <GestureDetector gesture={swipeGesture}>
            <ScreenScroll
              refreshControl={
                <RefreshControl
                  refreshing={state.refreshing}
                  onRefresh={() => {
                    void refresh();
                  }}
                  tintColor={Colors.shared.cairoGold}
                />
              }
            >
              <Animated.View
                key={segment}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
              >
                {segment === 'overview' ? (
                  <>
                    <Animated.View style={heroStyle}>
                      <HeroCard
                        assetsEgp={state.netWorth.assetsEgp}
                        assetsUsd={state.netWorth.assetsUsd}
                        rate={state.rate}
                        isManualOverride={state.isManualOverride}
                        assetsCount={state.accountCounts.assets}
                        liabilitiesCount={state.accountCounts.liabilities}
                        onPress={() => setBreakdownVisible(true)}
                      />
                    </Animated.View>

                    <Animated.View entering={statsEntering}>
                      <StatCards
                        netWorthEgp={state.netWorth.netWorthEgp}
                        assetsEgp={state.netWorth.assetsEgp}
                        liabilitiesEgp={state.netWorth.liabilitiesEgp}
                        assetsCount={state.accountCounts.assets}
                        liabilitiesCount={state.accountCounts.liabilities}
                        monthSpentEgp={state.monthSpend.currentEgp}
                        monthSpentUsd={state.monthSpend.currentUsdNative}
                        monthSpendDeltaPct={state.monthSpend.deltaPct}
                        monthSpendCount={state.monthSpend.currentCount}
                        spendYearMonth={state.monthSpend.yearMonth}
                      />
                    </Animated.View>

                    <CommitmentsCard
                      counts={state.commitments.counts}
                      totalsByCurrency={state.commitments.totalsByCurrency}
                      yearMonth={state.commitments.yearMonth}
                      onPress={goToCommitments}
                    />

                    <View style={{ height: Spacing.xxl }} />
                  </>
                ) : (
                  <>
                    <TotalBalanceStrip
                      assetsEgp={state.netWorth.assetsEgp}
                      accountsCount={totalAccountsCount}
                    />
                    {visibleTypes.map((type, index) => (
                      <Animated.View key={type} entering={sectionEntering(index)}>
                        <SectionHeader
                          title={SECTION_TITLES[type]}
                          count={state.groupedAccounts[type]?.length ?? 0}
                        />
                        <AccountCarousel
                          type={type}
                          accounts={state.groupedAccounts[type] ?? []}
                          rate={state.rate}
                          statsMap={state.statsMap}
                          onAccountPress={goToAccount}
                          onAddPress={goToAddAccount}
                        />
                      </Animated.View>
                    ))}
                    <View style={{ height: Spacing.xxl }} />
                  </>
                )}
              </Animated.View>
            </ScreenScroll>
          </GestureDetector>
        </>
      )}

      <NetWorthBreakdownSheet
        visible={state.isBreakdownVisible}
        onClose={() => setBreakdownVisible(false)}
        assetsEgp={state.netWorth.assetsEgp}
        liabilitiesEgp={state.netWorth.liabilitiesEgp}
        netWorthEgp={state.netWorth.netWorthEgp}
        netWorthUsd={state.netWorth.netWorthUsd}
        rate={state.rate}
        liquidity={state.liquidity}
        liabilities={state.liabilities}
      />
    </Screen>
  );
}
