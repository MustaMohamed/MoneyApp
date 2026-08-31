import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Button, Separator, Surface, Tabs, Typography } from 'heroui-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { RefreshControl, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { EmptyState } from '@/components/ui/empty_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size, Spacing } from '@/constants/theme';

import { AccountCarousel } from './components/account_carousel';
import { BudgetCard } from './components/budget_card';
import { CommitmentsCard } from './components/commitments_card';
import { DashboardLoadError } from './components/dashboard_load_error';
import { HeroCard } from './components/hero_card';
import { NetWorthBreakdownSheet } from './components/net_worth_breakdown_sheet';
import { SectionHeader } from './components/section_header';
import { StatCards } from './components/stat_cards';
import { TotalBalanceStrip } from './components/total_balance_strip';
import { TransactionsCard } from './components/transactions_card';
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
  [AccountType.Bank]: ACCOUNT_TYPE_LABELS[AccountType.Bank].toUpperCase(),
  [AccountType.SmartWallet]: ACCOUNT_TYPE_LABELS[AccountType.SmartWallet].toUpperCase(),
  [AccountType.PhysicalWallet]: ACCOUNT_TYPE_LABELS[AccountType.PhysicalWallet].toUpperCase(),
  [AccountType.PhysicalSavings]: ACCOUNT_TYPE_LABELS[AccountType.PhysicalSavings].toUpperCase(),
  [AccountType.CreditCard]: ACCOUNT_TYPE_LABELS[AccountType.CreditCard].toUpperCase(),
};

export default function DashboardScreen() {
  const {
    state,
    setBreakdownVisible,
    setSelectedSegment,
    refresh,
    retry,
    goToAccount,
    goToAddAccount,
    goToSettings,
    goToTransactions,
    goToBudget,
    goToCommitments,
  } = useDashboard();
  const { heroStyle, startEntrance, statsEntering, sectionEntering } = useDashboardAnim();

  useEffect(() => {
    startEntrance();
  }, [startEntrance]);

  const presentation = state.presentation;
  const visibleTypes = TYPE_ORDER.filter((type) => state.groupedAccounts[type]?.length);
  const segment = state.selectedSegment;
  const totalAccountsCount = state.accountCounts.assets + state.accountCounts.liabilities;
  const openBreakdown = useCallback(() => setBreakdownVisible(true), [setBreakdownVisible]);

  const onTabChange = useCallback(
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Tabs.onValueChange is string; tab values are always 'overview'|'accounts' per JSX
    (value: string) => setSelectedSegment(value as DashboardSegment),
    [setSelectedSegment],
  );

  // The offset gates let the account carousel win horizontal scrolling until the pan is decisive.
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
      <Surface variant="transparent" className="rounded-none px-4 py-0 shadow-none">
        <View
          style={{
            minHeight: Size.headerHeight,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: Spacing.sm,
          }}
        >
          <Typography.Heading type="h3" weight="bold" truncate className="font-sora">
            MoneyApp
          </Typography.Heading>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="bg-surface border-border rounded-lg border"
            style={{ width: Size.backBtn, height: Size.backBtn }}
            onPress={goToSettings}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <MaterialCommunityIcons name="cog" size={Size.iconMd} color={Colors.dark.text2} />
          </Button>
        </View>
      </Surface>
      <Separator />

      {presentation.showInitialError ? (
        <DashboardLoadError
          variant="initial"
          onRetry={() => {
            void retry();
          }}
        />
      ) : presentation.showAccountsEmptyState ? (
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
                  refreshing={presentation.isRefreshing}
                  onRefresh={() => {
                    void refresh();
                  }}
                  tintColor={Colors.shared.cairoGold}
                />
              }
            >
              <View>
                {segment === 'overview' ? (
                  <>
                    <Animated.View style={heroStyle}>
                      <HeroCard
                        netWorth={state.netWorth}
                        baseCurrency={state.baseCurrency}
                        rate={state.rate}
                        isRateUsable={state.isRateUsable}
                        isManualOverride={state.isManualOverride}
                        assetsCount={state.accountCounts.assets}
                        liabilitiesCount={state.accountCounts.liabilities}
                        isLoading={presentation.cardLoading}
                        onPress={presentation.hasSnapshot ? openBreakdown : undefined}
                      />
                    </Animated.View>

                    <Animated.View entering={statsEntering}>
                      <StatCards
                        netWorth={state.netWorth}
                        baseCurrency={state.baseCurrency}
                        assetsCount={state.accountCounts.assets}
                        liabilitiesCount={state.accountCounts.liabilities}
                        monthSpentEgp={state.monthSpend.currentEgp}
                        monthSpentUsd={state.monthSpend.currentUsdNative}
                        monthSpendDeltaPct={state.monthSpend.deltaPct}
                        monthSpendCount={state.monthSpend.currentCount}
                        spendYearMonth={state.monthSpend.yearMonth}
                        netWorthLoading={presentation.cardLoading}
                        monthSpendLoading={state.monthSpend.loading}
                      />
                    </Animated.View>

                    <TransactionsCard
                      current={state.transactions.current}
                      previous={state.transactions.previous}
                      previousLabel={state.transactions.previousLabel}
                      yearMonth={state.transactions.yearMonth}
                      isLoading={state.transactions.loading}
                      onPress={goToTransactions}
                    />

                    <BudgetCard
                      summary={state.budget.summary}
                      yearMonth={state.budget.yearMonth}
                      isLoading={state.budget.loading}
                      onPress={goToBudget}
                    />

                    <CommitmentsCard
                      counts={state.commitments.counts}
                      totalsByCurrency={state.commitments.totalsByCurrency}
                      yearMonth={state.commitments.yearMonth}
                      isLoading={state.commitments.loading}
                      onPress={goToCommitments}
                    />

                    <View style={{ height: Spacing.xxl }} />
                  </>
                ) : (
                  <>
                    <TotalBalanceStrip
                      netWorth={state.netWorth}
                      baseCurrency={state.baseCurrency}
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
                          baseCurrency={state.baseCurrency}
                          rate={state.rate}
                          isRateUsable={state.isRateUsable}
                          statsMap={state.statsMap}
                          onAccountPress={goToAccount}
                          onAddPress={goToAddAccount}
                        />
                      </Animated.View>
                    ))}
                    <View style={{ height: Spacing.xxl }} />
                  </>
                )}
              </View>
            </ScreenScroll>
          </GestureDetector>
        </>
      )}

      {presentation.showRefreshError ? (
        <DashboardLoadError
          variant="refresh"
          onRetry={() => {
            void retry();
          }}
        />
      ) : null}

      <NetWorthBreakdownSheet
        isOpen={state.isBreakdownVisible}
        onOpenChange={(open) => {
          if (!open) setBreakdownVisible(false);
        }}
        netWorth={state.netWorth}
        baseCurrency={state.baseCurrency}
        liquidity={state.liquidity}
        liabilities={state.liabilities}
      />
    </Screen>
  );
}
