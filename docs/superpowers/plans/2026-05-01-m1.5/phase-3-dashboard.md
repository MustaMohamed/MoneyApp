# M1.5 Phase 3 — Dashboard Screen (U2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Dashboard screen — hook, animations, all 7 components, and the screen template. Replaces the stub from Phase 2.

**Depends on:** Phase 2 complete (dashboard.helpers.ts, navigation scaffold, account store, currency store).

**Architecture:** `dashboard.hook.ts` owns all logic — reads stores, computes net worth, groups accounts, manages breakdown sheet visibility. `index.tsx` is a pure wiring template: no `useState`, no `useSharedValue`. Components are fully presentational — no store reads, no navigation calls.

**Design:** Cairo Nights v7 — exact pixel-perfect design is in Notion U2. Use design tokens from `constants/theme.ts` as reference.

---

### Task 9: Dashboard Screen (U2)

**Files:**
- Create: `app/(app)/(tabs)/dashboard/dashboard.hook.ts`
- Create: `app/(app)/(tabs)/dashboard/dashboard.anim.ts`
- Create: `app/(app)/(tabs)/dashboard/components/hero_card.tsx`
- Create: `app/(app)/(tabs)/dashboard/components/stat_cards.tsx`
- Create: `app/(app)/(tabs)/dashboard/components/section_header.tsx`
- Create: `app/(app)/(tabs)/dashboard/components/account_card.tsx`
- Create: `app/(app)/(tabs)/dashboard/components/add_card.tsx`
- Create: `app/(app)/(tabs)/dashboard/components/account_carousel.tsx`
- Create: `app/(app)/(tabs)/dashboard/components/net_worth_breakdown_sheet.tsx`
- Modify: `app/(app)/(tabs)/dashboard/index.tsx` (replace stub)

- [ ] **Step 1: Create dashboard.hook.ts**

```typescript
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';
import { computeNetWorth, groupAccountsByType } from './dashboard.helpers';

export function useDashboard() {
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const rate = useCurrencyStore((s) => s.rate);
  const lastFetched = useCurrencyStore((s) => s.lastFetched);
  const isManualOverride = useCurrencyStore((s) => s.isManualOverride);

  const [isBreakdownVisible, setBreakdownVisible] = useState(false);

  const netWorth = useMemo(() => computeNetWorth(accounts, rate), [accounts, rate]);
  const groupedAccounts = useMemo(() => groupAccountsByType(accounts), [accounts]);

  const goToAccount = (id: string) => router.push(`/accounts/${id}`);
  const goToAddAccount = () => router.push('/accounts/add_account');
  const goToSettings = () => router.push('/settings');

  return {
    accounts,
    rate,
    lastFetched,
    isManualOverride,
    netWorth,
    groupedAccounts,
    isBreakdownVisible,
    setBreakdownVisible,
    goToAccount,
    goToAddAccount,
    goToSettings,
  };
}
```

- [ ] **Step 2: Create dashboard.anim.ts**

```typescript
import {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export function useDashboardAnim() {
  const heroOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(16);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  const startEntrance = () => {
    heroOpacity.value = withTiming(1, { duration: 400 });
    heroTranslateY.value = withTiming(0, { duration: 400 });
  };

  return {
    heroStyle,
    startEntrance,
    statsEntering: FadeInUp.delay(150).duration(300),
    sectionEntering: (index: number) => FadeInUp.delay(250 + index * 80).duration(300),
  };
}
```

- [ ] **Step 3: Create components/hero_card.tsx**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { formatAmount } from '../dashboard.helpers';

interface HeroCardProps {
  assetsEgp: number;
  netWorthUsd: number;
  rate: number;
  isManualOverride: boolean;
  onPress: () => void;
}

export function HeroCard({
  assetsEgp,
  netWorthUsd,
  rate,
  isManualOverride,
  onPress,
}: HeroCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Text style={styles.label}>{Strings.dashAvailableToSpend}</Text>
      <Text style={styles.amount}>{formatAmount(assetsEgp)} EGP</Text>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>≈ {formatAmount(netWorthUsd, 0)} USD</Text>
        </View>
        <View style={[styles.badge, isManualOverride && styles.badgeManual]}>
          <Text style={styles.badgeText}>
            1 USD = {rate.toFixed(2)} EGP{isManualOverride ? ' ●' : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  amount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.hero,
    color: Colors.dark.gold,
    marginBottom: Spacing.sm,
  },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  badge: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  badgeManual: { borderWidth: 1, borderColor: Colors.shared.cairoGold },
  badgeText: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
});
```

- [ ] **Step 4: Create components/stat_cards.tsx**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { formatAmount } from '../dashboard.helpers';

interface StatCardsProps {
  netWorthEgp: number;
  monthSpentEgp: number;
}

export function StatCards({ netWorthEgp, monthSpentEgp }: StatCardsProps) {
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <Text style={styles.label}>{Strings.dashNetWorthTitle}</Text>
        <Text style={[styles.value, netWorthEgp < 0 && styles.negative]}>
          {formatAmount(netWorthEgp)} EGP
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>{Strings.dashMonthSpentTitle}</Text>
        <Text style={styles.value}>{formatAmount(monthSpentEgp)} EGP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    marginBottom: Spacing.xs,
  },
  value: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  negative: { color: Colors.dark.negative },
});
```

- [ ] **Step 5: Create components/section_header.tsx**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>{Strings.dashSeeAll}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.micro,
    color: Colors.shared.cairoGold,
    letterSpacing: 1,
  },
  seeAll: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
});
```

- [ ] **Step 6: Create components/account_card.tsx**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Currency } from '@/constants/enums';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { Account } from '@/store/account.store';
import { formatAmount } from '../dashboard.helpers';

interface AccountCardProps {
  account: Account;
  rate: number;
  onPress: () => void;
}

export function AccountCard({ account, rate, onPress }: AccountCardProps) {
  const balanceEgp =
    account.currency === Currency.USD ? account.current_balance * rate : account.current_balance;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.colorBar, { backgroundColor: account.color ?? Colors.dark.surfaceEl }]} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={styles.balance}>{formatAmount(balanceEgp)} EGP</Text>
        {account.currency === Currency.USD && (
          <Text style={styles.sub}>{formatAmount(account.current_balance, 2)} USD</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 170,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
    marginLeft: Spacing.xs,
  },
  colorBar: { height: 4, width: '100%' },
  body: { padding: Spacing.sm },
  name: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
    marginBottom: Spacing.xxs,
  },
  balance: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  sub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginTop: Spacing.xxs,
  },
});
```

- [ ] **Step 7: Create components/add_card.tsx**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';

const TYPE_LABEL: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};

interface AddCardProps {
  type: AccountType;
  onPress: () => void;
}

export function AddCard({ type, onPress }: AddCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <MaterialCommunityIcons name="plus" size={22} color={Colors.dark.text2} />
      <Text style={styles.label}>Add {TYPE_LABEL[type]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    minHeight: 80,
    backgroundColor: 'transparent',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
    gap: Spacing.xxs,
    padding: Spacing.sm,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textAlign: 'center',
  },
});
```

- [ ] **Step 8: Create components/account_carousel.tsx**

```tsx
import { ScrollView, StyleSheet, View } from 'react-native';

import { AccountType } from '@/constants/enums';
import { Spacing } from '@/constants/theme';
import type { Account } from '@/store/account.store';
import { AccountCard } from './account_card';
import { AddCard } from './add_card';

interface AccountCarouselProps {
  type: AccountType;
  accounts: Account[];
  rate: number;
  onAccountPress: (id: string) => void;
  onAddPress: () => void;
}

export function AccountCarousel({
  type,
  accounts,
  rate,
  onAccountPress,
  onAddPress,
}: AccountCarouselProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          rate={rate}
          onPress={() => onAccountPress(account.id)}
        />
      ))}
      <AddCard type={type} onPress={onAddPress} />
      <View style={styles.tail} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingLeft: Spacing.sm, alignItems: 'flex-start', paddingVertical: Spacing.xs },
  tail: { width: Spacing.sm },
});
```

- [ ] **Step 9: Create components/net_worth_breakdown_sheet.tsx**

```tsx
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { formatAmount } from '../dashboard.helpers';

interface NetWorthBreakdownSheetProps {
  visible: boolean;
  onClose: () => void;
  assetsEgp: number;
  liabilitiesEgp: number;
  netWorthEgp: number;
  netWorthUsd: number;
}

export function NetWorthBreakdownSheet({
  visible,
  onClose,
  assetsEgp,
  liabilitiesEgp,
  netWorthEgp,
  netWorthUsd,
}: NetWorthBreakdownSheetProps) {
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{Strings.dashNetWorthTitle}</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>{Strings.dashAssetsLabel}</Text>
          <Text style={[styles.rowValue, styles.positive]}>{formatAmount(assetsEgp)} EGP</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{Strings.dashLiabilitiesLabel}</Text>
          <Text style={[styles.rowValue, styles.negative]}>
            {formatAmount(liabilitiesEgp)} EGP
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={[styles.rowLabel, styles.totalLabel]}>{Strings.dashNetWorthTitle}</Text>
          <Text style={[styles.rowValue, styles.totalValue, netWorthEgp < 0 && styles.negative]}>
            {formatAmount(netWorthEgp)} EGP
          </Text>
        </View>
        <Text style={styles.usdLine}>≈ {formatAmount(netWorthUsd, 0)} USD</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  rowLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  rowValue: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  positive: { color: Colors.dark.positive },
  negative: { color: Colors.dark.negative },
  divider: { height: 1, backgroundColor: Colors.dark.border, marginVertical: Spacing.sm },
  totalLabel: { color: Colors.dark.text1, fontFamily: FontFamily.interSemi },
  totalValue: { fontSize: Type.subhead, fontFamily: FontFamily.soraBold },
  usdLine: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    textAlign: 'right',
    marginTop: Spacing.xxs,
  },
});
```

- [ ] **Step 10: Replace dashboard/index.tsx with full screen**

```tsx
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
```

- [ ] **Step 11: Commit**

```bash
git add app/\(app\)/\(tabs\)/dashboard/
git commit -m "feat: dashboard screen U2 — hero card, stat cards, account carousel, net worth breakdown sheet"
```
