import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty_states';
import { AccountType } from '@/constants/enums';
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

export default function DashboardScreen() {
  const {
    accounts,
    rate,
    netWorth,
    groupedAccounts,
    isBreakdownVisible,
    setBreakdownVisible,
    isManualOverride,
    goToAccount,
    goToAddAccount,
    goToSettings,
  } = useDashboard();
  const { heroStyle, startEntrance, statsEntering, sectionEntering } = useDashboardAnim();

  useEffect(() => {
    startEntrance();
  }, []);

  const hasAccounts = accounts.length > 0;
  const visibleTypes = TYPE_ORDER.filter((t) => groupedAccounts[t]?.length);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>MoneyApp</Text>
        <Pressable onPress={goToSettings} style={styles.settingsBtn}>
          <MaterialCommunityIcons name="cog" size={Size.iconMd} color={Colors.dark.text2} />
        </Pressable>
      </View>

      {!hasAccounts ? (
        <EmptyState variant="accounts" onAction={goToAddAccount} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={heroStyle}>
            <HeroCard
              assetsEgp={netWorth.assetsEgp}
              netWorthUsd={netWorth.netWorthUsd}
              rate={rate}
              isManualOverride={isManualOverride}
              onPress={() => setBreakdownVisible(true)}
            />
          </Animated.View>

          <Animated.View entering={statsEntering}>
            <StatCards netWorthEgp={netWorth.netWorthEgp} monthSpentEgp={0} />
          </Animated.View>

          {visibleTypes.map((type, index) => (
            <Animated.View key={type} entering={sectionEntering(index)}>
              <SectionHeader title={type.replace(/_/g, ' ').toUpperCase()} />
              <AccountCarousel
                type={type}
                accounts={groupedAccounts[type] ?? []}
                rate={rate}
                onAccountPress={goToAccount}
                onAddPress={goToAddAccount}
              />
            </Animated.View>
          ))}

          <View style={styles.bottomPad} />
        </ScrollView>
      )}

      <NetWorthBreakdownSheet
        visible={isBreakdownVisible}
        onClose={() => setBreakdownVisible(false)}
        assetsEgp={netWorth.assetsEgp}
        liabilitiesEgp={netWorth.liabilitiesEgp}
        netWorthEgp={netWorth.netWorthEgp}
        netWorthUsd={netWorth.netWorthUsd}
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
