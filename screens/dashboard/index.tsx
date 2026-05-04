import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty_states';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { useDashboard } from './dashboard.hook';
import { useDashboardAnim } from './dashboard.anim';
import { HeroCard } from './components/hero_card';
import { StatCards } from './components/stat_cards';
import { SectionHeader } from './components/section_header';
import { AccountCarousel } from './components/account_carousel';
import { NetWorthBreakdownSheet } from './components/net_worth_breakdown_sheet';

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
  const { state, setBreakdownVisible, refresh, goToAccount, goToAddAccount, goToSettings } =
    useDashboard();
  const { heroStyle, startEntrance, statsEntering, sectionEntering } = useDashboardAnim();

  useEffect(() => {
    startEntrance();
  }, []);

  const hasAccounts = state.accounts.length > 0;
  const visibleTypes = TYPE_ORDER.filter((t) => state.groupedAccounts[t]?.length);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>MoneyApp</Text>
        <Pressable onPress={goToSettings} style={styles.settingsBtn}>
          <MaterialCommunityIcons name="cog" size={Size.iconMd} color={Colors.dark.text2} />
        </Pressable>
      </View>

      {!hasAccounts ? (
        <EmptyState
          variant="accounts"
          onAction={goToAddAccount}
          actionLabel={Strings.emptyAccountsCta}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={refresh}
              tintColor={Colors.shared.cairoGold}
            />
          }
        >
          <Animated.View style={heroStyle}>
            <HeroCard
              assetsEgp={state.netWorth.assetsEgp}
              netWorthUsd={state.netWorth.netWorthUsd}
              rate={state.rate}
              isManualOverride={state.isManualOverride}
              onPress={() => setBreakdownVisible(true)}
            />
          </Animated.View>

          <Animated.View entering={statsEntering}>
            <StatCards netWorthEgp={state.netWorth.netWorthEgp} monthSpentEgp={0} />
          </Animated.View>

          {visibleTypes.map((type, index) => (
            <Animated.View key={type} entering={sectionEntering(index)}>
              <SectionHeader title={SECTION_TITLES[type]} />
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

          <View style={styles.bottomPad} />
        </ScrollView>
      )}

      <NetWorthBreakdownSheet
        visible={state.isBreakdownVisible}
        onClose={() => setBreakdownVisible(false)}
        assetsEgp={state.netWorth.assetsEgp}
        liabilitiesEgp={state.netWorth.liabilitiesEgp}
        netWorthEgp={state.netWorth.netWorthEgp}
        netWorthUsd={state.netWorth.netWorthUsd}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  wordmark: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  settingsBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    backgroundColor: Colors.dark.surface,
    borderRadius: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  bottomPad: { height: Spacing.xxl },
});
